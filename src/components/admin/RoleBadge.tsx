import type { UserRole } from "@/types/auth";

export function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        isAdmin
          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
          : "bg-black/5 text-foreground/70 dark:bg-white/10"
      }`}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}
