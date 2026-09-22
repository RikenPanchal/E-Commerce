import type { Metadata } from "next";
import { CollectionForm } from "@/components/admin/collections/CollectionForm";

export const metadata: Metadata = {
  title: "Add collection",
};

export default function NewCollectionPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add collection</h1>
        <p className="text-sm text-foreground/60">Curate a themed set of products for the storefront</p>
      </div>
      <CollectionForm />
    </div>
  );
}
