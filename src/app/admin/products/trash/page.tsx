import type { Metadata } from "next";
import Link from "next/link";
import { getTrashedProducts } from "@/lib/admin/products";
import { ProductThumbnail } from "@/components/admin/products/ProductThumbnail";
import { RestoreButton } from "@/components/admin/products/RestoreButton";

export const metadata: Metadata = {
  title: "Trash",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminProductsTrashPage() {
  const products = await getTrashedProducts();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Trash</h1>
          <p className="text-sm text-foreground/60">
            {products.length} deleted products
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-sm font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
        >
          Back to products
        </Link>
      </div>

      <div className="relative overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Deleted</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-foreground/60"
                >
                  Trash is empty.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail
                        media={product.media}
                        name={product.name}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {product.name}
                        </span>
                        <span className="text-xs text-foreground/50">
                          SKU {product.sku}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-foreground/60">
                    {product.deletedAt
                      ? dateFormatter.format(new Date(product.deletedAt))
                      : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <RestoreButton productId={product.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
