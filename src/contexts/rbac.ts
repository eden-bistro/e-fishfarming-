import { getSessionUser } from "@/lib/auth";

export const APP_ROLES = ["admin", "farm_user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const INITIAL_ADMIN_EMAIL = "fishhydro1@gmail.com";

function isInitialAdmin(email: string) {
  return email.trim().toLowerCase() === INITIAL_ADMIN_EMAIL;
}

export function getCurrentUserRole(): AppRole {
  const user = getSessionUser();
  if (!user) return "farm_user";
  return isInitialAdmin(user.email) ? "admin" : "farm_user";
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
