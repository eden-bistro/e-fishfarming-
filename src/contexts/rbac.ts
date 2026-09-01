import { getSessionUser } from "@/lib/auth";

export const APP_ROLES = ["admin", "farm_user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export function getCurrentUserRole(): AppRole {
  const role = getSessionUser()?.role;
  return role === "admin" ? "admin" : "farm_user";
}

export function setCurrentUserRole(_role: AppRole) {
  // Roles are intentionally not writable from the browser. Role assignment is enforced by
  // Supabase user/profile metadata, SQL helper functions, RLS policies, and server route guards.
}

export function userHasRole(allowed: AppRole[]) {
  return allowed.includes(getCurrentUserRole());
}

export function isAdminUser() {
  return getCurrentUserRole() === "admin";
}
