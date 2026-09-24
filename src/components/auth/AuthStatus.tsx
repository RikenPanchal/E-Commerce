import Link from "next/link";
import { getHeaderUser } from "@/lib/auth/getHeaderUser";
import { AccountMenu } from "@/components/auth/AccountMenu";

export async function AuthStatus() {
  const user = await getHeaderUser();

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm font-medium sm:gap-4">
        <Link
          href="/signin"
          className="whitespace-nowrap px-1 text-foreground/80 transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="whitespace-nowrap rounded-md bg-foreground px-3.5 py-2 text-xs font-medium tracking-wide text-background transition-colors hover:bg-foreground/85 sm:px-4 sm:text-sm"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return <AccountMenu name={user.name} email={user.email} isAdmin={user.role === "admin"} />;
}
