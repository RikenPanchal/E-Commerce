import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/auth/SignOutButton";

// Covers every nested admin page in one place (Next merges metadata up the
// segment tree) - none of the admin console is public content, and it's
// also already blocked in robots.txt, so this is belt-and-suspenders for
// crawlers that ignore robots.txt or reach a page via a stray link.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy (src/proxy.ts) already gatekeeps `/admin/*`, but every
  // Server Component re-checks authorization itself rather than trusting
  // the proxy alone. This single check covers every page nested under it.
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-black/5 px-4 py-4 dark:border-white/10 sm:px-6">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs text-foreground/60">Signed in as</span>
            <span className="truncate text-sm font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
