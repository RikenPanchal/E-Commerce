import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductViewById } from "@/lib/admin/products";
import { getPublicProductsByIds } from "@/lib/shop/products";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = {
  title: "Edit product",
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductViewById(id);

  if (!product) {
    notFound();
  }

  // Resolved here (one server-side call) so the Complete the Look picker
  // can show real names for the already-saved picks without the form
  // needing its own fetch just to label chips it already has the ids for.
  const complementaryProducts =
    product.complementaryProductIds.length > 0
      ? await getPublicProductsByIds(product.complementaryProductIds)
      : [];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit product</h1>
        <p className="text-sm text-foreground/60">{product.name}</p>
      </div>
      <ProductForm product={product} complementaryProducts={complementaryProducts} />
    </div>
  );
}
