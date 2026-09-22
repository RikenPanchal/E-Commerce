"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/data/categories";
import type { CouponResponse, CouponView, DiscountType } from "@/types/coupon";

export function CouponForm({ coupon }: { coupon?: CouponView }) {
  const router = useRouter();
  const isEdit = Boolean(coupon);

  const [code, setCode] = useState(coupon?.code ?? "");
  const [discountType, setDiscountType] = useState<DiscountType>(coupon?.discountType ?? "percentage");
  const [value, setValue] = useState(coupon?.value !== undefined ? String(coupon.value) : "");
  const [minOrderAmount, setMinOrderAmount] = useState(
    coupon?.minOrderAmount !== undefined ? String(coupon.minOrderAmount) : ""
  );
  const [maxUses, setMaxUses] = useState(coupon?.maxUses !== undefined ? String(coupon.maxUses) : "");
  const [applicableCategories, setApplicableCategories] = useState<ProductCategory[]>(
    coupon?.applicableCategories ?? []
  );
  const [expiresAt, setExpiresAt] = useState(coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : "");
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);

  function toggleCategory(category: ProductCategory) {
    setApplicableCategories((previous) =>
      previous.includes(category) ? previous.filter((item) => item !== category) : [...previous, category]
    );
  }

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch(isEdit ? `/api/admin/coupons/${coupon?.id}` : "/api/admin/coupons", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          value,
          minOrderAmount: minOrderAmount.trim() || undefined,
          maxUses: maxUses.trim() || undefined,
          applicableCategories,
          expiresAt: expiresAt.trim() || undefined,
          isActive,
        }),
      });
      const data = (await response.json()) as CouponResponse;

      if (!data.success) {
        setFormError(data.message);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      router.push("/admin/coupons");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="text-sm font-medium text-foreground">
          Code
        </label>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="SUMMER20"
          className="w-fit rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm uppercase outline-none focus:border-rose-400 dark:border-white/15"
        />
        {fieldErrors.code ? <p className="text-xs text-red-500">{fieldErrors.code}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="discountType" className="text-sm font-medium text-foreground">
            Discount type
          </label>
          <select
            id="discountType"
            value={discountType}
            onChange={(event) => setDiscountType(event.target.value as DiscountType)}
            className="rounded-md border border-black/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
          >
            <option value="percentage" className="bg-background text-foreground">
              Percentage (%)
            </option>
            <option value="fixed" className="bg-background text-foreground">
              Fixed amount (₹)
            </option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="value" className="text-sm font-medium text-foreground">
            {discountType === "percentage" ? "Percent off" : "Amount off (₹)"}
          </label>
          <input
            id="value"
            type="number"
            min="0"
            step={discountType === "percentage" ? "1" : "0.01"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
          {fieldErrors.value ? <p className="text-xs text-red-500">{fieldErrors.value}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minOrderAmount" className="text-sm font-medium text-foreground">
            Minimum order (₹, optional)
          </label>
          <input
            id="minOrderAmount"
            type="number"
            min="0"
            value={minOrderAmount}
            onChange={(event) => setMinOrderAmount(event.target.value)}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxUses" className="text-sm font-medium text-foreground">
            Max total uses (optional)
          </label>
          <input
            id="maxUses"
            type="number"
            min="1"
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            className="rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-white/15"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Restrict to categories (optional)</span>
        <p className="text-xs text-foreground/50">
          Leave all unchecked to let this coupon apply to the whole order.
        </p>
        <div className="flex flex-wrap gap-3">
          {PRODUCT_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={applicableCategories.includes(category)}
                onChange={() => toggleCategory(category)}
                className="accent-rose-800"
              />
              {category}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="expiresAt" className="text-sm font-medium text-foreground">
          Expires on (optional)
        </label>
        <input
          id="expiresAt"
          type="date"
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          className="w-fit rounded-md border border-black/10 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-rose-400 dark:border-white/15"
        />
      </div>

      <label className="flex w-fit items-center gap-2 text-sm text-foreground/80">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          className="accent-rose-600"
        />
        Active
      </label>

      {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-fit rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create coupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          className="text-sm font-medium text-foreground/70 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
