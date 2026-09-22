import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getAddressesForUser } from "@/lib/account/addresses";
import { getActiveBackInStockSubscriptionsForUser } from "@/lib/shop/backInStock";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { AddressBook } from "@/components/account/AddressBook";
import { BackInStockAlerts } from "@/components/account/BackInStockAlerts";

export const metadata: Metadata = {
  title: "My account",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?from=/account");
  }

  const addresses = await getAddressesForUser(user.id);
  const backInStockAlerts = await getActiveBackInStockSubscriptionsForUser(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-2xl font-bold text-foreground">My account</h1>

      <section className="mt-8 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Profile</h2>
        <ProfileForm user={user} />
      </section>

      <section className="mt-10 flex flex-col gap-4 border-t border-black/5 pt-8 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Password</h2>
        <PasswordForm />
      </section>

      <section className="mt-10 flex flex-col gap-4 border-t border-black/5 pt-8 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Addresses</h2>
        <AddressBook addresses={addresses} />
      </section>

      <section className="mt-10 flex flex-col gap-4 border-t border-black/5 pt-8 dark:border-white/10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Back-in-stock alerts</h2>
        <BackInStockAlerts alerts={backInStockAlerts} />
      </section>
    </div>
  );
}
