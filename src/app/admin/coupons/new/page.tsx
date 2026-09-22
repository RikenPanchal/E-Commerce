import type { Metadata } from "next";
import { CouponForm } from "@/components/admin/coupons/CouponForm";

export const metadata: Metadata = {
  title: "Add coupon",
};

export default function NewCouponPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add coupon</h1>
        <p className="text-sm text-foreground/60">Create a new discount code for your store</p>
      </div>
      <CouponForm />
    </div>
  );
}
