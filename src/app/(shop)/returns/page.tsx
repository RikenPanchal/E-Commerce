import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/seo/site";

const linkClass = "font-medium text-rose-400 underline underline-offset-4 hover:text-rose-300";

export const metadata: Metadata = {
  title: "Return Policy",
};

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Return Policy"
      updatedAt="2026-09-24"
      intro="Please read this policy carefully before placing an order. Sales made through E-Commerce are final, except for items that arrive damaged, defective, or incorrect - see Section 2."
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
          <strong className="font-semibold text-foreground">How to report a problem:</strong> email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>{" "}
          with the details above, using a subject line like &quot;Damaged item - Order #1234ABCD&quot;.
          You can find your order number under{" "}
          <Link href="/orders" className={linkClass}>
            My orders
          </Link>
          . We&apos;ll review your claim and reply by email with next steps.
        </p>
        <p>
          Claims made after 48 hours, or for items that have been worn, washed, or altered, cannot
          be honored.
        </p>
      </LegalSection>

      <LegalSection heading="3. Cancelled or undelivered orders">
        <p>
          If your order is cancelled by us before it ships (for example, due to a stock
          discrepancy), or if it is confirmed lost in transit by our courier partner, you will be
          refunded in full to your original payment method. If your payment didn&apos;t go through,
          nothing was charged and there&apos;s nothing to refund.
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
          <Link href="/shipping" className={linkClass}>
            Shipping Policy
          </Link>{" "}
          for delivery details, or review a product&apos;s reviews and size chart on its product
          page. This policy is part of our{" "}
          <Link href="/terms" className={linkClass}>
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
