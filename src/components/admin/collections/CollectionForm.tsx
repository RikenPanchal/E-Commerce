"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CollectionResponse, CollectionView } from "@/types/collection";
import type { ProductView } from "@/types/product";
import type { ProductsPageResponse } from "@/app/api/products/route";
import { formatCurrency } from "@/lib/utils/currency";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/admin/collections/icons";

interface CollectionFormProps {
  collection?: CollectionView;
  /** The collection's already-assigned products, resolved server-side (in
   *  the collection's own order) - lets the picker show real names/prices/
   *  thumbnails for existing picks without an extra client fetch just to
   *  label them. Mirrors how `ProductForm` resolves `complementaryProducts`. */
  initialProducts?: ProductView[];
}

interface PickedProduct {
  id: string;
  name: string;
  price: number;
  thumbnailUrl?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500">{message}</p>;
}

function toPicked(product: ProductView): PickedProduct {
  const image = product.media.find((item) => item.type === "image");
  return { id: product.id, name: product.name, price: product.price, thumbnailUrl: image?.url };
}

const MAX_PRODUCTS = 200;

export function CollectionForm({ collection, initialProducts = [] }: CollectionFormProps) {
  const router = useRouter();
  const isEdit = Boolean(collection);

  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [isActive, setIsActive] = useState(collection?.isActive ?? true);

  const [existingImageUrl, setExistingImageUrl] = useState(collection?.image?.url);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<PickedProduct[]>(() => initialProducts.map(toPicked));
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<PickedProduct[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local preview only - revoked on change/unmount, never sent anywhere;
  // the actual file is uploaded on submit. Same pairing-in-one-effect
  // approach as `MediaManager`'s `NewFilePreview`. Clearing the preview when
  // there's no file happens directly in the event handlers below (never
  // inside this effect), so the effect itself only ever sets state in
  // response to a real file being picked.
  useEffect(() => {
    if (!newImageFile) return;
    const objectUrl = URL.createObjectURL(newImageFile);
    // Creating the object URL and revoking it must happen in the same
    // effect invocation, or React Strict Mode's dev-only double-invoke
    // revokes it before the <img> can ever load it - same necessary
    // bootstrap read as `MediaManager`'s `NewFilePreview`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [newImageFile]);

  // Debounced live search against the existing public catalog search - same
  // approach as `ProductForm`'s "Complete the Look" picker, so "only real,
  // active (non-deleted) products are selectable" is enforced by
  // construction rather than a second copy of that rule here.
  useEffect(() => {
    const query = productQuery.trim();
    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProductResults([]);
      return;
    }

    let cancelled = false;
    setIsSearchingProducts(true);
    const timeout = window.setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query)}&page=0`)
        .then((res) => (res.ok ? (res.json() as Promise<ProductsPageResponse>) : Promise.reject()))
        .then((data) => {
          if (cancelled) return;
          const selectedIds = new Set(products.map((item) => item.id));
          setProductResults(
            data.products
              .filter((item) => !selectedIds.has(item.id))
              .slice(0, 8)
              .map(toPicked)
          );
        })
        .catch(() => {
          if (!cancelled) setProductResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingProducts(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [productQuery, products]);

  function addProduct(item: PickedProduct) {
    if (products.length >= MAX_PRODUCTS) return;
    setProducts((previous) => (previous.some((row) => row.id === item.id) ? previous : [...previous, item]));
    setProductQuery("");
    setProductResults([]);
  }

  function removeProduct(id: string) {
    setProducts((previous) => previous.filter((row) => row.id !== id));
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setProducts((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleImageChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setNewImageFile(file);
    setImageRemoved(false);
  }

  function handleRemoveImage() {
    setNewImageFile(null);
    setNewImagePreview(null);
    setExistingImageUrl(undefined);
    setImageRemoved(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("slug", slug);
    formData.append("isActive", String(isActive));
    formData.append("productIds", JSON.stringify(products.map((item) => item.id)));
    if (newImageFile) formData.append("image", newImageFile);
    if (imageRemoved) formData.append("removeImage", "true");

    try {
      const response = await fetch(
        isEdit ? `/api/admin/collections/${collection?.id}` : "/api/admin/collections",
        { method: isEdit ? "PATCH" : "POST", body: formData }
      );
      const data = (await response.json()) as CollectionResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      router.push("/admin/collections");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayImageUrl = newImagePreview ?? existingImageUrl;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Basic details</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Collection name
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Summer Edit"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-sm font-medium text-foreground">
            Slug
          </label>
          <input
            id="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Leave blank to generate from the name"
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
          <p className="text-xs text-foreground/50">
            Lowercase letters, numbers and hyphens only. Used in the storefront URL: /collections/{slug || "your-slug"}
          </p>
          <FieldError message={fieldErrors.slug} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="A short line of copy shown on the collection page."
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="h-4 w-4 accent-rose-600"
          />
          Active - visible on the storefront
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Collection image</h2>
          <p className="text-xs text-foreground/50">Shown on the homepage strip, the collections index, and the collection page banner.</p>
        </div>

        <div className="flex items-center gap-4">
          {displayImageUrl ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-black/10 dark:border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayImageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/20 text-xs text-foreground/40 dark:border-white/20">
              No image
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
            >
              {displayImageUrl ? "Change image" : "Upload image"}
            </button>
            {displayImageUrl ? (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-left text-xs font-medium text-foreground/50 hover:text-red-500"
              >
                Remove image
              </button>
            ) : null}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handleImageChange(event.target.files)}
          />
        </div>
        <p className="text-xs text-foreground/50">JPG, PNG, WEBP or GIF, up to 8MB.</p>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Products</h2>
          <p className="text-xs text-foreground/50">
            Search the catalog to add products. Reorder with the arrows - this is the order shoppers see them in.
          </p>
        </div>

        {products.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {products.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveProduct(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.name} up`}
                    className="text-foreground/40 transition-colors hover:text-foreground disabled:opacity-20"
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProduct(index, 1)}
                    disabled={index === products.length - 1}
                    aria-label={`Move ${item.name} down`}
                    className="text-foreground/40 transition-colors hover:text-foreground disabled:opacity-20"
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-md bg-black/5 dark:bg-white/10" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                  <span className="text-xs text-foreground/50">{formatCurrency(item.price)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="shrink-0 text-xs font-medium text-foreground/50 hover:text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/60">No products added yet.</p>
        )}

        {products.length < MAX_PRODUCTS ? (
          <div className="relative">
            <input
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Search products to add..."
              className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
            {productQuery.trim() ? (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-black/10 bg-background shadow-lg dark:border-white/15">
                {isSearchingProducts ? (
                  <p className="px-3 py-2 text-xs text-foreground/50">Searching...</p>
                ) : productResults.length > 0 ? (
                  productResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addProduct(item)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-black/5 dark:bg-white/10" />
                      )}
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <span className="shrink-0 text-xs text-foreground/50">{formatCurrency(item.price)}</span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-foreground/50">No matching products</p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-foreground/50">Maximum of {MAX_PRODUCTS} reached.</p>
        )}
        <FieldError message={fieldErrors.productIds} />
      </section>

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-rose-600 px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create collection"}
        </button>
        {isEdit ? (
          <a
            href={`/collections/${collection?.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
          >
            Preview
          </a>
        ) : null}
      </div>
    </form>
  );
}
