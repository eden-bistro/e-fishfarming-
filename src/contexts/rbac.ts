import { getSessionUser } from "@/lib/auth";

export const APP_ROLES = ["system", "super_admin", "farmer", "accountant", "worker"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const ROLE_KEY = "aquasmart_user_role";

function isBrowser() {
  return typeof window !== "undefined";
}

function roleKey(userId: string) {
  return `${ROLE_KEY}:${userId}`;
}

function isSystemUser(email: string) {
  return email.trim().toLowerCase().startsWith("system@");
}

export function getCurrentUserRole(): AppRole {
  const user = getSessionUser();
  if (!user) return "farmer";
  if (isSystemUser(user.email)) return "system";
  if (!isBrowser()) return "farmer";
  const role = window.localStorage.getItem(roleKey(user.id)) as AppRole | null;
  return role && APP_ROLES.includes(role) ? role : "farmer";
}

export function setCurrentUserRole(role: AppRole) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(roleKey(user.id), role);
}

export function userHasRole(allowed: AppRole[]) {
  const role = getCurrentUserRole();
  return role === "system" || allowed.includes(role);
}
