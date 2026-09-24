import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

/**
 * `getCurrentUser`, deduplicated per server render - the site header
 * resolves the signed-in user in two places (AuthStatus for the account
 * menu, MobileNavServer for the mobile nav), and this keeps that to one
 * database lookup per request. Kept separate from `getCurrentUser` itself
 * so API routes that update the user and then re-read it never get a
 * cached, stale copy.
 */
export const getHeaderUser = cache(getCurrentUser);
