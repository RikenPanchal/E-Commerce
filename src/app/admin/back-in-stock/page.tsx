import type { Metadata } from "next";
import { getBackInStockOverview } from "@/lib/admin/backInStock";

export const metadata: Metadata = {
  title: "Back-in-stock alerts",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminBackInStockPage() {
  const rows = await getBackInStockOverview();
  const totalActive = rows.reduce((sum, row) => sum + row.activeCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Back-in-stock alerts</h1>
        <p className="text-sm text-foreground/60">
          {totalActive} customer{totalActive === 1 ? "" : "s"} waiting across {rows.length} item
          {rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Variant</th>
              <th className="px-6 py-3 font-medium">Waiting</th>
              <th className="px-6 py-3 font-medium">Notified</th>
              <th className="px-6 py-3 font-medium">Oldest request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-foreground/60">
                  No back-in-stock alerts yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.productId}-${row.variantId ?? "base"}`}>
                  <td className="px-6 py-3 font-medium text-foreground">{row.productName}</td>
                  <td className="px-6 py-3 text-foreground/70">
                    {[row.size, row.color].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-6 py-3 font-medium text-rose-600 dark:text-rose-300">{row.activeCount}</td>
                  <td className="px-6 py-3 text-foreground/70">{row.notifiedCount}</td>
                  <td className="px-6 py-3 text-foreground/60">
                    {row.oldestActiveAt ? dateFormatter.format(new Date(row.oldestActiveAt)) : "-"}
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
