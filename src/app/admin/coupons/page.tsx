import type { Metadata } from "next";
import Link from "next/link";
import { getAllCoupons } from "@/lib/admin/coupons";
import { DeleteCouponButton } from "@/components/admin/coupons/DeleteCouponButton";
import { formatCurrency } from "@/lib/utils/currency";

export const metadata: Metadata = {
  title: "Coupons",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminCouponsPage() {
  const coupons = await getAllCoupons();
  const totalDiscountGiven = coupons.reduce((sum, coupon) => sum + coupon.totalDiscountGiven, 0);
  const totalUses = coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Coupons</h1>
          <p className="text-sm text-foreground/60">{coupons.length} coupons</p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
        >
          Add coupon
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <p className="text-xs text-foreground/50">Total discount given</p>
          <p className="mt-1 text-xl font-semibold text-rose-600 dark:text-rose-300">
            {formatCurrency(totalDiscountGiven)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <p className="text-xs text-foreground/50">Times redeemed</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{totalUses}</p>
        </div>
        <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <p className="text-xs text-foreground/50">Active coupons</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {coupons.filter((coupon) => coupon.isActive).length}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-medium">Code</th>
              <th className="px-6 py-3 font-medium">Discount</th>
              <th className="px-6 py-3 font-medium">Min. order</th>
              <th className="px-6 py-3 font-medium">Uses</th>
              <th className="px-6 py-3 font-medium">Discount given</th>
              <th className="px-6 py-3 font-medium">Expires</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {coupons.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-foreground/60"
                >
                  No coupons yet.{" "}
                  <Link
                    href="/admin/coupons/new"
                    className="text-rose-600 underline dark:text-rose-400"
                  >
                    Create one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-6 py-3 font-mono font-medium text-foreground">
                    {coupon.code}
                    {coupon.applicableCategories && coupon.applicableCategories.length > 0 ? (
                      <div className="mt-0.5 font-sans text-[10px] font-normal text-foreground/50">
                        {coupon.applicableCategories.join(", ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-3 text-foreground/70">
                    {coupon.discountType === "percentage"
                      ? `${coupon.value}%`
                      : formatCurrency(coupon.value)}
                  </td>
                  <td className="px-6 py-3 text-foreground/70">
                    {coupon.minOrderAmount
                      ? formatCurrency(coupon.minOrderAmount)
                      : "-"}
                  </td>
                  <td className="px-6 py-3 text-foreground/70">
                    {coupon.usedCount}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-6 py-3 font-medium text-rose-600 dark:text-rose-300">
                    {coupon.totalDiscountGiven > 0 ? formatCurrency(coupon.totalDiscountGiven) : "-"}
                  </td>
                  <td className="px-6 py-3 text-foreground/60">
                    {coupon.expiresAt
                      ? dateFormatter.format(new Date(coupon.expiresAt))
                      : "Never"}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        coupon.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-black/5 text-foreground/60 dark:bg-white/10"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/admin/coupons/${coupon.id}/edit`}
                        className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
                      >
                        Edit
                      </Link>
                      <DeleteCouponButton
                        couponId={coupon.id}
                        code={coupon.code}
                      />
                    </div>
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
