"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES } from "@/lib/data/categories";
import { PRODUCT_SIZES, type ProductSize } from "@/lib/data/productOptions";
import { MediaManager } from "@/components/admin/products/MediaManager";
import { hexForColorName, nameForHex } from "@/lib/data/colorNames";
import type { ProductResponse, ProductView } from "@/types/product";
import type { ProductsPageResponse } from "@/app/api/products/route";

interface ProductFormProps {
  product?: ProductView;
  /** Names for `product.complementaryProductIds`, resolved server-side by
   *  the edit page - lets the picker below show real chips for
   *  already-saved picks without an extra client fetch just to label them. */
  complementaryProducts?: ProductView[];
}

// A color row auto-syncs in both directions until the admin overrides one
// side by hand: typing a name (e.g. "Rose") fills in the matching swatch
// (hexTouched stays false), and picking a swatch fills in the closest color
// name (nameTouched stays false) - each stops auto-matching only once the
// admin has actually edited that side themselves, so neither overwrites a
// deliberate choice.
interface ColorRow {
  id: string;
  name: string;
  hex: string;
  hexTouched: boolean;
  nameTouched: boolean;
}

const DEFAULT_COLOR_HEX = "#e11d48";

function createColorId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// A variant is optional and additive (see `ProductVariant` on the Product
// model) - a product that never has any row here behaves exactly as it did
// before variants existed. Row ids are local-only (React keys / edit
// targets), separate from the variant's real database id which only exists
// once saved.
interface VariantRow {
  id: string;
  size?: ProductSize;
  color?: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  isActive: boolean;
}

function createVariantRow(overrides: Partial<VariantRow> = {}): VariantRow {
  return {
    id: createColorId(),
    size: undefined,
    color: undefined,
    sku: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    isActive: true,
    ...overrides,
  };
}

function variantComboKey(size?: string, color?: string): string {
  return `${size ?? ""}::${(color ?? "").trim().toLowerCase()}`;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500">{message}</p>;
}

export function ProductForm({ product, complementaryProducts = [] }: ProductFormProps) {
  const router = useRouter();
  const isEdit = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(
    product?.category ?? PRODUCT_CATEGORIES[0],
  );
  const [price, setPrice] = useState(
    product?.price !== undefined ? String(product.price) : "",
  );
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice !== undefined ? String(product.compareAtPrice) : "",
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [stock, setStock] = useState(
    product?.stock !== undefined ? String(product.stock) : "0",
  );
  const [sizes, setSizes] = useState<ProductSize[]>(product?.sizes ?? []);
  const [colors, setColors] = useState<ColorRow[]>(
    () =>
      product?.colors.map((color) => ({
        id: createColorId(),
        name: color.name,
        hex: color.hex ?? DEFAULT_COLOR_HEX,
        // Existing colors keep whatever hex they were saved with - typing
        // in the name field shouldn't silently change a saved product's color.
        hexTouched: true,
        // ...and vice versa: picking a different swatch on a saved product
        // shouldn't silently rename it either.
        nameTouched: true,
      })) ?? [],
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    () =>
      product?.variants.map((variant) =>
        createVariantRow({
          size: variant.size,
          color: variant.color,
          sku: variant.sku ?? "",
          price: variant.price !== undefined ? String(variant.price) : "",
          compareAtPrice: variant.compareAtPrice !== undefined ? String(variant.compareAtPrice) : "",
          stock: String(variant.stock),
          isActive: variant.isActive,
        }),
      ) ?? [],
  );
  const [complements, setComplements] = useState<{ id: string; name: string }[]>(
    () => complementaryProducts.map((item) => ({ id: item.id, name: item.name })),
  );
  const [complementQuery, setComplementQuery] = useState("");
  const [complementResults, setComplementResults] = useState<{ id: string; name: string }[]>([]);
  const [isSearchingComplements, setIsSearchingComplements] = useState(false);

  const [material, setMaterial] = useState(product?.material ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleSize(size: ProductSize) {
    setSizes((previous) =>
      previous.includes(size)
        ? previous.filter((item) => item !== size)
        : [...previous, size],
    );
  }

  function addColor() {
    setColors((previous) => [
      ...previous,
      {
        id: createColorId(),
        name: "",
        hex: DEFAULT_COLOR_HEX,
        hexTouched: false,
        nameTouched: false,
      },
    ]);
  }

  function updateColorName(id: string, name: string) {
    setColors((previous) =>
      previous.map((color) => {
        if (color.id !== id) return color;
        const matchedHex = color.hexTouched ? undefined : hexForColorName(name);
        return { ...color, name, hex: matchedHex ?? color.hex, nameTouched: true };
      }),
    );
  }

  function updateColorHex(id: string, hex: string) {
    setColors((previous) =>
      previous.map((color) => {
        if (color.id !== id) return color;
        // Only fill in the name automatically if the admin hasn't already
        // typed one - picking a swatch on a color they've named "Dusty
        // Rose" shouldn't rename it to whatever the nearest match is.
        const matchedName = color.nameTouched ? undefined : nameForHex(hex);
        return { ...color, hex, hexTouched: true, name: matchedName ?? color.name };
      }),
    );
  }

  function removeColor(id: string) {
    setColors((previous) => previous.filter((color) => color.id !== id));
  }

  // Fills in one row per size x color combination that doesn't already have
  // one, from the sizes/colors currently selected above - existing rows
  // (and whatever SKU/price/stock the admin already entered on them) are
  // left untouched, so re-running this after adding one more color doesn't
  // discard work already done on the others.
  function generateVariantRows() {
    const colorNames = colors.map((color) => color.name.trim()).filter(Boolean);
    const existingCombos = new Set(variants.map((row) => variantComboKey(row.size, row.color)));

    const toAdd: VariantRow[] = [];
    if (sizes.length > 0 && colorNames.length > 0) {
      for (const colorName of colorNames) {
        for (const sizeValue of sizes) {
          const key = variantComboKey(sizeValue, colorName);
          if (existingCombos.has(key)) continue;
          existingCombos.add(key);
          toAdd.push(createVariantRow({ size: sizeValue, color: colorName }));
        }
      }
    } else if (sizes.length > 0) {
      for (const sizeValue of sizes) {
        const key = variantComboKey(sizeValue, undefined);
        if (existingCombos.has(key)) continue;
        existingCombos.add(key);
        toAdd.push(createVariantRow({ size: sizeValue }));
      }
    } else if (colorNames.length > 0) {
      for (const colorName of colorNames) {
        const key = variantComboKey(undefined, colorName);
        if (existingCombos.has(key)) continue;
        existingCombos.add(key);
        toAdd.push(createVariantRow({ color: colorName }));
      }
    }

    if (toAdd.length > 0) {
      setVariants((previous) => [...previous, ...toAdd]);
    }
  }

  function addVariantRow() {
    setVariants((previous) => [...previous, createVariantRow()]);
  }

  function updateVariantRow(id: string, patch: Partial<VariantRow>) {
    setVariants((previous) => previous.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeVariantRow(id: string) {
    setVariants((previous) => previous.filter((row) => row.id !== id));
  }

  const variantComboCounts = new Map<string, number>();
  for (const row of variants) {
    const key = variantComboKey(row.size, row.color);
    variantComboCounts.set(key, (variantComboCounts.get(key) ?? 0) + 1);
  }
  const variantSkuCounts = new Map<string, number>();
  for (const row of variants) {
    if (!row.sku.trim()) continue;
    const key = row.sku.trim().toUpperCase();
    variantSkuCounts.set(key, (variantSkuCounts.get(key) ?? 0) + 1);
  }
  const totalVariantStock = variants.reduce((sum, row) => sum + (Number(row.stock) || 0), 0);
  const MAX_COMPLEMENTS = 8;

  // Debounced live search against the existing public catalog search - the
  // same one Shop's search box uses, so "only real, active products are
  // selectable" is enforced by construction (it already excludes deleted
  // products) rather than a second copy of that rule here.
  useEffect(() => {
    const query = complementQuery.trim();
    if (!query) {
      // Resetting to empty the instant the search box is cleared.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setComplementResults([]);
      return;
    }

    let cancelled = false;
    setIsSearchingComplements(true);
    const timeout = window.setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query)}&page=0`)
        .then((res) => (res.ok ? (res.json() as Promise<ProductsPageResponse>) : Promise.reject()))
        .then((data) => {
          if (cancelled) return;
          const selectedIds = new Set([product?.id, ...complements.map((item) => item.id)].filter(Boolean));
          setComplementResults(
            data.products
              .filter((item) => !selectedIds.has(item.id))
              .slice(0, 6)
              .map((item) => ({ id: item.id, name: item.name })),
          );
        })
        .catch(() => {
          if (!cancelled) setComplementResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingComplements(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [complementQuery, complements, product?.id]);

  function addComplement(item: { id: string; name: string }) {
    if (complements.length >= MAX_COMPLEMENTS) return;
    setComplements((previous) => (previous.some((row) => row.id === item.id) ? previous : [...previous, item]));
    setComplementQuery("");
    setComplementResults([]);
  }

  function removeComplement(id: string) {
    setComplements((previous) => previous.filter((row) => row.id !== id));
  }

  function addTag() {
    const value = tagDraft.trim();
    if (value && !tags.includes(value) && tags.length < 20) {
      setTags((previous) => [...previous, value]);
    }
    setTagDraft("");
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tag: string) {
    setTags((previous) => previous.filter((item) => item !== tag));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("price", price);
    if (compareAtPrice.trim())
      formData.append("compareAtPrice", compareAtPrice);
    if (sku.trim()) formData.append("sku", sku);
    formData.append("stock", stock);
    formData.append("sizes", JSON.stringify(sizes));
    formData.append(
      "colors",
      JSON.stringify(
        colors
          .filter((color) => color.name.trim().length > 0)
          .map((color) => ({ name: color.name, hex: color.hex })),
      ),
    );
    formData.append(
      "variants",
      JSON.stringify(
        variants.map((row) => ({
          size: row.size,
          color: row.color,
          sku: row.sku.trim() || undefined,
          price: row.price.trim() ? row.price : undefined,
          compareAtPrice: row.compareAtPrice.trim() ? row.compareAtPrice : undefined,
          stock: row.stock,
          isActive: row.isActive,
        })),
      ),
    );
    formData.append("complementaryProductIds", JSON.stringify(complements.map((item) => item.id)));
    if (material.trim()) formData.append("material", material);
    if (brand.trim()) formData.append("brand", brand);
    formData.append("tags", JSON.stringify(tags));
    formData.append("isFeatured", String(isFeatured));
    newFiles.forEach((file) => formData.append("media", file));
    if (isEdit && removedMediaIds.length > 0) {
      formData.append("removeMediaIds", JSON.stringify(removedMediaIds));
    }

    try {
      const response = await fetch(
        isEdit ? `/api/admin/products/${product?.id}` : "/api/admin/products",
        { method: isEdit ? "PATCH" : "POST", body: formData },
      );
      const data = (await response.json()) as ProductResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Basic details</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            Product name
          </label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            placeholder="Floral Wrap Dress"
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium text-foreground"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            placeholder="Tell customers what makes this piece special..."
          />
          <FieldError message={fieldErrors.description} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="category"
            className="text-sm font-medium text-foreground"
          >
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as typeof category)
            }
            className="rounded-md border border-black/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
          >
            {PRODUCT_CATEGORIES.map((option) => (
              <option
                key={option}
                value={option}
                className="bg-background text-foreground"
              >
                {option}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.category} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          Pricing &amp; inventory
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="price"
              className="text-sm font-medium text-foreground"
            >
              Price (₹)
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
            <FieldError message={fieldErrors.price} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="compareAtPrice"
              className="text-sm font-medium text-foreground"
            >
              Compare-at (₹)
            </label>
            <input
              id="compareAtPrice"
              type="number"
              min="0"
              step="0.01"
              value={compareAtPrice}
              onChange={(event) => setCompareAtPrice(event.target.value)}
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
            <FieldError message={fieldErrors.compareAtPrice} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="stock"
              className="text-sm font-medium text-foreground"
            >
              Stock
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={variants.length > 0 ? String(totalVariantStock) : stock}
              onChange={(event) => setStock(event.target.value)}
              disabled={variants.length > 0}
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 disabled:bg-black/[.03] disabled:text-foreground/50 dark:border-white/15 dark:disabled:bg-white/[.03]"
            />
            {variants.length > 0 ? (
              <p className="text-xs text-foreground/50">Calculated automatically from variant stock below</p>
            ) : null}
            <FieldError message={fieldErrors.stock} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="sku"
              className="text-sm font-medium text-foreground"
            >
              SKU
            </label>
            <input
              id="sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              placeholder="Auto-generated"
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
            <FieldError message={fieldErrors.sku} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">Variants</h2>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Sizes</span>
          <div className="flex flex-wrap gap-3">
            {PRODUCT_SIZES.map((size) => (
              <label
                key={size}
                className="flex items-center gap-1.5 text-sm text-foreground/80"
              >
                <input
                  type="checkbox"
                  checked={sizes.includes(size)}
                  onChange={() => toggleSize(size)}
                  className="accent-rose-600"
                />
                {size}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Colors</span>
          {colors.map((color) => {
            // Catches exactly the bug this was added for: a saved color
            // named e.g. "White" whose swatch was never actually set to
            // white (often because it's an existing product, where editing
            // the name deliberately doesn't auto-overwrite a hand-picked
            // hex - see updateColorName). Flagging the mismatch instead of
            // silently "fixing" it keeps genuinely custom shades untouched.
            const suggestedHex = hexForColorName(color.name);
            const hasMismatch = Boolean(
              suggestedHex &&
                color.name.trim().length > 0 &&
                suggestedHex.toLowerCase() !== color.hex.toLowerCase(),
            );
            return (
              <div key={color.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color.hex}
                    onChange={(event) =>
                      updateColorHex(color.id, event.target.value)
                    }
                    className="h-9 w-9 shrink-0 rounded border border-black/10 dark:border-white/15"
                  />
                  <input
                    value={color.name}
                    onChange={(event) =>
                      updateColorName(color.id, event.target.value)
                    }
                    placeholder="Color name (e.g. Rose)"
                    className="flex-1 rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
                  />
                  <button
                    type="button"
                    onClick={() => removeColor(color.id)}
                    className="text-xs font-medium text-foreground/50 hover:text-red-500"
                  >
                    Remove
                  </button>
                </div>
                {hasMismatch ? (
                  <div className="ml-11 flex flex-wrap items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: suggestedHex }}
                    />
                    <span>
                      This swatch doesn&apos;t look like &quot;{color.name}&quot; - customers will see the wrong color.
                    </span>
                    <button
                      type="button"
                      onClick={() => updateColorHex(color.id, suggestedHex!)}
                      className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      Use this shade
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addColor}
            className="w-fit text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
          >
            + Add color
          </button>
        </div>

        {/* Optional per-combination pricing/stock. A product with no rows
            here behaves exactly as before this existed: one shared
            price/stock for every size/color combination. Only meaningful
            once at least one size or color is selected above. */}
        <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">Variant pricing &amp; stock (optional)</span>
              <span className="text-xs text-foreground/50">
                Give a specific size/color combination its own SKU, price, or stock. Leave empty to use one shared
                price and stock for every combination.
              </span>
            </div>
            <div className="flex gap-2">
              {sizes.length > 0 || colors.some((color) => color.name.trim()) ? (
                <button
                  type="button"
                  onClick={generateVariantRows}
                  className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground hover:border-rose-300 dark:border-white/15"
                >
                  Generate from sizes/colors
                </button>
              ) : null}
              <button
                type="button"
                onClick={addVariantRow}
                className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-foreground hover:border-rose-300 dark:border-white/15"
              >
                + Add variant
              </button>
            </div>
          </div>

          {variants.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 bg-black/[.02] dark:border-white/15 dark:bg-white/[.03]">
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Color</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Size</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">SKU</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Price</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Compare-at</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Stock</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">Active</th>
                    <th scope="col" className="px-2.5 py-2 font-medium text-foreground/70">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((row) => {
                    const comboKey = variantComboKey(row.size, row.color);
                    const isDuplicateCombo = (variantComboCounts.get(comboKey) ?? 0) > 1;
                    const isDuplicateSku =
                      row.sku.trim().length > 0 && (variantSkuCounts.get(row.sku.trim().toUpperCase()) ?? 0) > 1;
                    return (
                      <tr key={row.id} className="border-b border-black/10 last:border-0 dark:border-white/10">
                        <td className="px-2.5 py-2">
                          <select
                            value={row.color ?? ""}
                            onChange={(event) =>
                              updateVariantRow(row.id, { color: event.target.value || undefined })
                            }
                            className={`rounded-md border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-rose-400 ${
                              isDuplicateCombo ? "border-red-400" : "border-black/10 dark:border-white/15"
                            }`}
                          >
                            <option value="">—</option>
                            {colors
                              .filter((color) => color.name.trim())
                              .map((color) => (
                                <option key={color.id} value={color.name}>
                                  {color.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-2.5 py-2">
                          <select
                            value={row.size ?? ""}
                            onChange={(event) =>
                              updateVariantRow(row.id, {
                                size: (event.target.value || undefined) as ProductSize | undefined,
                              })
                            }
                            className={`rounded-md border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-rose-400 ${
                              isDuplicateCombo ? "border-red-400" : "border-black/10 dark:border-white/15"
                            }`}
                          >
                            <option value="">—</option>
                            {sizes.map((sizeValue) => (
                              <option key={sizeValue} value={sizeValue}>
                                {sizeValue}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            value={row.sku}
                            onChange={(event) => updateVariantRow(row.id, { sku: event.target.value })}
                            placeholder="Auto"
                            className={`w-24 rounded-md border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-rose-400 ${
                              isDuplicateSku ? "border-red-400" : "border-black/10 dark:border-white/15"
                            }`}
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price}
                            onChange={(event) => updateVariantRow(row.id, { price: event.target.value })}
                            placeholder={price || "Base"}
                            className="w-20 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-rose-400 dark:border-white/15"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.compareAtPrice}
                            onChange={(event) => updateVariantRow(row.id, { compareAtPrice: event.target.value })}
                            placeholder="—"
                            className="w-20 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-rose-400 dark:border-white/15"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.stock}
                            onChange={(event) => updateVariantRow(row.id, { stock: event.target.value })}
                            className="w-16 rounded-md border border-black/10 bg-transparent px-2 py-1.5 text-xs outline-none focus:border-rose-400 dark:border-white/15"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(event) => updateVariantRow(row.id, { isActive: event.target.checked })}
                            className="accent-rose-600"
                            aria-label="Variant active"
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          <button
                            type="button"
                            onClick={() => removeVariantRow(row.id)}
                            className="text-xs font-medium text-foreground/50 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {variants.some((row) => (variantComboCounts.get(variantComboKey(row.size, row.color)) ?? 0) > 1) ? (
                <p className="border-t border-black/10 px-2.5 py-2 text-xs text-red-500 dark:border-white/10">
                  Two or more variants share the same size and color - each combination must be unique.
                </p>
              ) : null}
              {variants.some(
                (row) => row.sku.trim() && (variantSkuCounts.get(row.sku.trim().toUpperCase()) ?? 0) > 1,
              ) ? (
                <p className="border-t border-black/10 px-2.5 py-2 text-xs text-red-500 dark:border-white/10">
                  Two or more variants share the same SKU - each SKU must be unique.
                </p>
              ) : null}
            </div>
          ) : null}
          <FieldError message={fieldErrors.variants} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Complete the Look</h2>
          <p className="text-xs text-foreground/50">
            Pick real products from the catalog that pair well with this one (e.g. a bag or jewelry for a dress).
            Shown on the product page instead of a generic recommendation when set.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {complements.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {complements.map((item) => (
                <span
                  key={item.id}
                  className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs text-foreground/80 dark:bg-white/10"
                >
                  {item.name}
                  <button
                    type="button"
                    onClick={() => removeComplement(item.id)}
                    aria-label={`Remove ${item.name} from Complete the Look`}
                    className="text-foreground/50 hover:text-red-500"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {complements.length < MAX_COMPLEMENTS ? (
            <div className="relative">
              <input
                value={complementQuery}
                onChange={(event) => setComplementQuery(event.target.value)}
                placeholder="Search products to add..."
                className="w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
              />
              {complementQuery.trim() ? (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-black/10 bg-background shadow-lg dark:border-white/15">
                  {isSearchingComplements ? (
                    <p className="px-3 py-2 text-xs text-foreground/50">Searching...</p>
                  ) : complementResults.length > 0 ? (
                    complementResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addComplement(item)}
                        className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        {item.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-foreground/50">No matching products</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-foreground/50">Maximum of {MAX_COMPLEMENTS} reached.</p>
          )}
          <FieldError message={fieldErrors.complementaryProductIds} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          Additional details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="material"
              className="text-sm font-medium text-foreground"
            >
              Material
            </label>
            <input
              id="material"
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              placeholder="100% Cotton"
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="brand"
              className="text-sm font-medium text-foreground"
            >
              Brand
            </label>
            <input
              id="brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Tags</span>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-black/10 px-2 py-1.5 dark:border-white/15">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs text-foreground/80 dark:bg-white/10"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-foreground/50"
                >
                  &times;
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="Type and press Enter"
              className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>

        <label className="flex w-fit items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
            className="accent-rose-600"
          />
          Feature on the homepage
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-foreground">
          Photos &amp; video
        </h2>
        <MediaManager
          existingMedia={product?.media ?? []}
          removedMediaIds={removedMediaIds}
          onRemoveExisting={(id) =>
            setRemovedMediaIds((previous) => [...previous, id])
          }
          onRestoreExisting={(id) =>
            setRemovedMediaIds((previous) =>
              previous.filter((item) => item !== id),
            )
          }
          newFiles={newFiles}
          onAddFiles={(files) =>
            setNewFiles((previous) => [...previous, ...files])
          }
          onRemoveNewFile={(index) =>
            setNewFiles((previous) => previous.filter((_, i) => i !== index))
          }
        />
      </section>

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="text-sm font-medium text-foreground/70 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
