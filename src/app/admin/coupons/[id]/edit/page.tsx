import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCouponById } from "@/lib/admin/coupons";
import { CouponForm } from "@/components/admin/coupons/CouponForm";

export const metadata: Metadata = {
  title: "Edit coupon",
};

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await getCouponById(id);

  if (!coupon) {
    notFound();
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Edit coupon</h1>
        <p className="text-sm text-foreground/60">{coupon.code}</p>
      </div>
      <CouponForm coupon={coupon} />
    </div>
  );
}
