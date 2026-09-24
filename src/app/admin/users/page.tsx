import type { Metadata } from "next";
import { getAllUsers } from "@/lib/admin/users";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { UserRoleToggle } from "@/components/admin/UserRoleToggle";

export const metadata: Metadata = {
  title: "Users",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([getAllUsers(), getCurrentUser()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-foreground/60">{users.length} registered accounts</p>
      </div>

      <div className="relative overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/5 text-xs uppercase tracking-wide text-foreground/50 dark:border-white/10">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Joined</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                <td className="px-6 py-4 text-foreground/70">{user.email}</td>
                <td className="px-6 py-4">
                  <RoleBadge role={user.role} />
                </td>
                <td className="px-6 py-4 text-foreground/60">
                  {dateFormatter.format(new Date(user.createdAt))}
                </td>
                <td className="px-6 py-4">
                  <UserRoleToggle
                    userId={user.id}
                    role={user.role}
                    disabled={user.id === currentUser?.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
