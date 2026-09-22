import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getAddressesForUser } from "@/lib/account/addresses";
import { CheckoutForm } from "@/components/shop/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">Checkout</h1>
      <CheckoutForm defaultName={user.name} savedAddresses={addresses} />
    </div>
  );
}
