import { getSessionUser } from "@/lib/auth";

export const APP_ROLES = ["admin", "farm_user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export function getCurrentUserRole(): AppRole {
  const user = getSessionUser();
  const email = user?.email?.trim().toLowerCase();

  // Keep existing browser sessions consistent with the designated admin account.
  // Server-side authorization remains authoritative for protected device setup routes.
  if (email === "fishhydro1@gmail.com" || user?.role === "admin") {
    return "admin";
  }

  return "farm_user";
}

export function setCurrentUserRole(_role: AppRole) {
  // Roles are intentionally not writable from the browser. Role assignment is enforced by
  // Supabase user/profile metadata, SQL helper functions, and server route guards.
}

export function userHasRole(allowed: AppRole[]) {
  return allowed.includes(getCurrentUserRole());
}

export function isAdminUser() {
  return getCurrentUserRole() === "admin";
}
