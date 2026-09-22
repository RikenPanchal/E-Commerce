import { z } from "zod";

export const updateRoleSchema = z.object({
  role: z.enum(["admin", "user"]),
});

export type UpdateRoleSchema = z.infer<typeof updateRoleSchema>;
