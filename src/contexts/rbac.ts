import { getSessionUser } from "@/lib/auth";

export const APP_ROLES = ["super_admin", "farmer", "accountant", "worker"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const ROLE_KEY = "aquasmart_user_role";

function isBrowser() {
  return typeof window !== "undefined";
}

function roleKey(userId: string) {
  return `${ROLE_KEY}:${userId}`;
}

export function getCurrentUserRole(): AppRole {
  const user = getSessionUser();
  if (!user || !isBrowser()) return "farmer";
  const role = window.localStorage.getItem(roleKey(user.id)) as AppRole | null;
  return role && APP_ROLES.includes(role) ? role : "farmer";
}

export function setCurrentUserRole(role: AppRole) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(roleKey(user.id), role);
}

export function userHasRole(allowed: AppRole[]) {
  return allowed.includes(getCurrentUserRole());
}
