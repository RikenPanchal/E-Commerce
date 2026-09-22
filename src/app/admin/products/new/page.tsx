import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = {
  title: "Add product",
};

export default function NewProductPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add product</h1>
        <p className="text-sm text-foreground/60">Create a new listing for your store</p>
      </div>
      <ProductForm />
    </div>
  );
}
