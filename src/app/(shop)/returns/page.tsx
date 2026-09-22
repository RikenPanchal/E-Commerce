import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Return Policy",
};

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Return Policy"
      updatedAt="2026-01-01"
      intro="Please read this policy carefully before placing an order - all sales made through E-Commerce are final."
    >
      <LegalSection heading="1. All sales are final">
        <p>
          We do not accept returns, exchanges, or cancellations once an order has been placed and
          confirmed, including for reasons such as a change of mind, an incorrect size or color
          selected at checkout, or simply no longer wanting the item. Please review product
          details, size charts, and photos carefully before completing your purchase, as no order
          can be returned for these reasons after it ships.
        </p>
        <p>
          Because we do not accept returns, we also cannot offer refunds, store credit, or
          exchanges for orders that fall outside the narrow exception described below.
        </p>
      </LegalSection>

      <LegalSection heading="2. The only exception: damaged, defective, or incorrect items">
        <p>
          If the item you receive is materially damaged, defective, or is not what you ordered
          (wrong product, wrong size shipped in error, etc.), contact us within{" "}
          <strong className="font-semibold text-foreground">48 hours of delivery</strong> and we
          will arrange a replacement of the same item where stock allows, or a refund to your
          original payment method where it does not. This exception exists only to correct our own
          errors - it is not a general right of return.
        </p>
        <p>To make a claim under this exception, please have ready:</p>
        <ul className="list-disc pl-5">
          <li>Your order number (found on your confirmation email or the Orders page)</li>
          <li>Clear photos of the item received, including any damage or defect</li>
          <li>A brief description of what&apos;s wrong</li>
        </ul>
        <p>
          Claims made after 48 hours, or for items that have been worn, washed, or altered, cannot
          be honored.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cancelled or undelivered orders">
        <p>
          If your order is cancelled by us before it ships (for example, due to a stock
          discrepancy), or if it is confirmed lost in transit by our courier partner, you will be
          refunded in full to your original payment method. Cash-on-delivery orders that never
          arrive are simply not charged.
        </p>
      </LegalSection>

      <LegalSection heading="4. Refund timelines">
        <p>
          Where a refund is due under Section 2 or 3, it is issued to the original payment method
          within 7-10 business days of approval. Bank processing times beyond that point are
          outside our control.
        </p>
      </LegalSection>

      <LegalSection heading="5. Questions before you order">
        <p>
          If you&apos;re unsure about sizing, color, or fit, please reach out to us before placing
          your order rather than after - see our{" "}
          <Link href="/shipping" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Shipping Policy
          </Link>{" "}
          for delivery details, or review a product&apos;s reviews and size chart on its product
          page. This policy is part of our{" "}
          <Link href="/terms" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
