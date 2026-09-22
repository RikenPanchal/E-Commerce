import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Shipping Policy",
};

export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      updatedAt="2026-01-01"
      intro="Where we deliver, how long it takes, and what it costs."
    >
      <LegalSection heading="1. Processing time">
        <p>
          Orders are packed and handed to our courier partner within 1-2 business days of being
          placed. Orders placed on weekends or public holidays begin processing on the next
          business day. You&apos;ll receive an email once your order has shipped.
        </p>
      </LegalSection>

      <LegalSection heading="2. Delivery timelines">
        <p>Estimated delivery time from the date your order ships:</p>
        <ul className="list-disc pl-5">
          <li>Metro cities: 2-4 business days</li>
          <li>Other cities and towns: 4-7 business days</li>
          <li>Remote or rural pin codes: 7-10 business days</li>
        </ul>
        <p>
          These are estimates, not guarantees - weather, regional holidays, and courier network
          disruptions can occasionally add delays outside our control.
        </p>
      </LegalSection>

      <LegalSection heading="3. Shipping charges">
        <p>
          We offer <strong className="font-semibold text-foreground">free shipping on every order, anywhere in India</strong>.
          There are no delivery fees added at checkout, regardless of order value or destination.
        </p>
      </LegalSection>

      <LegalSection heading="4. Cash on delivery">
        <p>
          Cash on delivery (COD) is available on most pin codes, shown automatically at checkout
          when eligible. A small COD handling fee may apply and, when it does, is shown before you
          confirm your order - never added afterward.
        </p>
      </LegalSection>

      <LegalSection heading="5. Tracking your order">
        <p>
          Once your order ships, you can track its status any time from the{" "}
          <span className="font-medium text-foreground">Orders</span> page in your account, or via
          the tracking link sent to your email.
        </p>
      </LegalSection>

      <LegalSection heading="6. Multiple items, multiple parcels">
        <p>
          If your order contains items from different warehouses or with different processing
          times, it may arrive in more than one parcel. You&apos;ll never be charged extra shipping
          for this - the total you paid at checkout is final.
        </p>
      </LegalSection>

      <LegalSection heading="7. Failed delivery attempts">
        <p>
          Our courier partners typically make up to 2 delivery attempts. If both attempts fail
          (address not reachable, no one available to receive the order), the parcel is returned
          to us and, for prepaid orders, refunded in line with the &ldquo;cancelled or undelivered
          orders&rdquo; clause of our Return Policy.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
