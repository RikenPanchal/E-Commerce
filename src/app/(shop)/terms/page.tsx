import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updatedAt="2026-01-01"
      intro="The terms that apply when you use E-Commerce and place an order with us."
    >
      <LegalSection heading="1. Acceptance of terms">
        <p>
          By creating an account, browsing, or placing an order on E-Commerce, you agree to these
          Terms &amp; Conditions, along with our{" "}
          <Link href="/privacy" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Privacy Policy
          </Link>
          ,{" "}
          <Link href="/shipping" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Shipping Policy
          </Link>
          , and{" "}
          <Link href="/returns" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Return Policy
          </Link>
          . If you do not agree, please do not use the site.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You&apos;re responsible for keeping your password confidential and for all activity under
          your account. You must provide accurate information when creating an account or placing
          an order, and you must be legally able to enter into a binding contract to make a
          purchase.
        </p>
      </LegalSection>

      <LegalSection heading="3. Products, pricing &amp; availability">
        <p>
          We try to keep product descriptions, images, pricing, and stock levels accurate, but
          errors can occur. We reserve the right to correct pricing or listing errors, limit order
          quantities, or cancel an order affected by such an error - in which case any payment
          already made will be refunded in full. Colors may appear slightly different on your
          screen than in person.
        </p>
      </LegalSection>

      <LegalSection heading="4. Orders &amp; payment">
        <p>
          Placing an order is an offer to purchase, which we accept when payment is confirmed. All
          orders are paid online at checkout via Razorpay - UPI, cards, netbanking and wallets are
          supported; we don&apos;t offer cash on delivery. We may cancel or refuse any order at our
          discretion - for example, on suspicion of fraud, pricing errors, or if an item turns out
          to be out of stock - in which case any payment already made is refunded in full.
        </p>
      </LegalSection>

      <LegalSection heading="5. Returns &amp; cancellations">
        <p>
          Orders placed through E-Commerce are final. Please see our{" "}
          <Link href="/returns" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            Return Policy
          </Link>{" "}
          for the narrow exception covering damaged, defective, or incorrectly shipped items.
        </p>
      </LegalSection>

      <LegalSection heading="6. Reviews &amp; user content">
        <p>
          If you submit a product review, you confirm it&apos;s honest, based on your own
          experience, and doesn&apos;t contain unlawful, abusive, or misleading content. We may
          remove reviews that violate this. By submitting a review, you grant us a non-exclusive
          right to display it on the site.
        </p>
      </LegalSection>

      <LegalSection heading="7. Intellectual property">
        <p>
          All content on this site - including text, graphics, logos, and product photography - is
          owned by us or our licensors and may not be copied, reproduced, or used commercially
          without our written permission.
        </p>
      </LegalSection>

      <LegalSection heading="8. Prohibited use">
        <p>
          You agree not to misuse the site - including attempting unauthorized access, disrupting
          its normal operation, scraping content at scale, or using it for any unlawful purpose.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, E-Commerce is not liable for indirect,
          incidental, or consequential damages arising from your use of the site or products
          purchased through it. Nothing in these terms limits any right you have that cannot
          lawfully be excluded.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to these terms">
        <p>
          We may update these terms from time to time; the date at the top of this page reflects
          the latest revision. Continued use of the site after a change means you accept the
          updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contact us">
        <p>
          Questions about these terms? Reach out to us at{" "}
          <a href="mailto:support@e-commerce.example" className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            support@e-commerce.example
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
