import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeBackInStockPanel } from "@/components/shop/UnsubscribeBackInStockPanel";

export const metadata: Metadata = {
  title: "Unsubscribe",
};

export default function UnsubscribeBackInStockPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Back-in-stock alert</h1>
      <Suspense fallback={null}>
        <UnsubscribeBackInStockPanel />
      </Suspense>
    </div>
  );
}
