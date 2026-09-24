import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { PRIVACY_EMAIL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="2026-01-01"
      intro="What information we collect, how we use it, and the choices you have."
    >
      <LegalSection heading="1. Information we collect">
        <p>We collect information you give us directly, such as when you:</p>
        <ul className="list-disc pl-5">
          <li>Create an account (name, email address, password)</li>
          <li>Place an order (shipping address, phone number, order contents)</li>
          <li>Save an address, write a product review, or contact support</li>
        </ul>
        <p>
          We also automatically collect limited technical information - like your browser type and
          general usage of the site - to keep it working correctly and secure. We never collect or
          store your full card or payment details ourselves; those are handled directly by our
          payment processor (see Section 3).
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <ul className="list-disc pl-5">
          <li>To create and manage your account, and process and deliver your orders</li>
          <li>To send order confirmations, shipping updates, and respond to support requests</li>
          <li>To show you your own order history, saved addresses, and reviews</li>
          <li>To detect and prevent fraud, abuse, or security issues</li>
          <li>To improve the site based on how it&apos;s actually used</li>
        </ul>
        <p>We do not sell your personal information to third parties.</p>
      </LegalSection>

      <LegalSection heading="3. Who we share it with">
        <p>We share information only where it&apos;s needed to run the service:</p>
        <ul className="list-disc pl-5">
          <li>
            <span className="font-medium text-foreground">Delivery partners</span> - your name,
            address, and phone number, so your order can actually reach you
          </li>
          <li>
            <span className="font-medium text-foreground">Payment processors</span> - to securely
            handle any online payment; we do not see or store your card details
          </li>
          <li>
            <span className="font-medium text-foreground">Service providers</span> who help us
            operate the site (such as hosting and email delivery), under obligations to protect
            your data
          </li>
        </ul>
        <p>We may also disclose information if required to by law.</p>
      </LegalSection>

      <LegalSection heading="4. Cookies">
        <p>
          We use essential cookies to keep you signed in and remember what&apos;s in your cart.
          These are necessary for the site to function and are not used for third-party
          advertising.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We keep your account and order information for as long as your account is active, and
          for a reasonable period afterward to meet accounting, tax, and legal record-keeping
          requirements.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your choices">
        <ul className="list-disc pl-5">
          <li>You can review and update your profile and saved addresses at any time in your account settings</li>
          <li>You can request a copy of your data, or ask us to delete your account, by contacting support</li>
          <li>You can unsubscribe from marketing emails using the link in any such email</li>
        </ul>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>
          Passwords are stored using industry-standard hashing, never in plain text. We take
          reasonable technical and organizational measures to protect your information, but no
          method of transmission or storage is 100% secure.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to this policy">
        <p>
          If we make material changes to this policy, we&apos;ll update the date at the top of this
          page. Continuing to use the site after changes take effect means you accept the updated
          policy.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact us">
        <p>
          Questions about this policy or your data? Reach out to us at{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
            {PRIVACY_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
