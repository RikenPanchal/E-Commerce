import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getAddressesForUser } from "@/lib/account/addresses";
import { getActiveBackInStockSubscriptionsForUser } from "@/lib/shop/backInStock";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { AddressBook } from "@/components/account/AddressBook";
import { BackInStockAlerts } from "@/components/account/BackInStockAlerts";
import { PageHero } from "@/components/shop/PageHero";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin?from=/account");
  }

  const addresses = await getAddressesForUser(user.id);
  const backInStockAlerts = await getActiveBackInStockSubscriptionsForUser(user.id);

  return (
    <div className="flex flex-col">
      <PageHero
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "My account" }]}
        eyebrow="Your account"
        title="My account"
        description="Manage your profile, password, saved addresses and alerts."
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-800">Profile</h2>
          <ProfileForm user={user} />
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-800">Password</h2>
          <PasswordForm />
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-800">Addresses</h2>
          <AddressBook addresses={addresses} />
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-surface-border bg-background p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-800">Back-in-stock alerts</h2>
          <BackInStockAlerts alerts={backInStockAlerts} />
        </section>
      </div>
    </div>
  );
}
