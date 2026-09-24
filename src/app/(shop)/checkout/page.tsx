import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getAddressesForUser } from "@/lib/account/addresses";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { PageHero } from "@/components/shop/PageHero";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  // Browsing and the cart are guest-friendly; only this final step requires
  // an account. Bounce signed-out visitors to sign in, then straight back here.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?from=/checkout");
  }

  const addresses = await getAddressesForUser(user.id);

  return (
    <div className="flex flex-col">
      <PageHero
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bag", href: "/cart" }, { label: "Checkout" }]}
        eyebrow="Secure checkout"
        title="Checkout"
        description="Review your bag and confirm your delivery details."
      />

      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <CheckoutForm defaultName={user.name} defaultEmail={user.email} savedAddresses={addresses} />
      </div>
    </div>
  );
}
