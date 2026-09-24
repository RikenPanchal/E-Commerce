import { getHeaderUser } from "@/lib/auth/getHeaderUser";
import { MobileNav } from "@/components/home/MobileNav";

/** Resolves the signed-in user on the server so the mobile nav can show
 *  account links (or sign-in buttons) without a client-side fetch. */
export async function MobileNavServer() {
  const user = await getHeaderUser();
  return (
    <MobileNav user={user ? { name: user.name, email: user.email, isAdmin: user.role === "admin" } : null} />
  );
}
