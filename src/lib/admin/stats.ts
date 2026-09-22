import { connectDB } from "@/lib/db/connectDB";
import User from "@/models/User";

export interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalCustomers: number;
  newThisWeek: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);
  const [totalUsers, totalAdmins, newThisWeek] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
  ]);

  return {
    totalUsers,
    totalAdmins,
    totalCustomers: totalUsers - totalAdmins,
    newThisWeek,
  };
}
