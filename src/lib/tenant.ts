import { getSessionUser } from "@/lib/auth";

const ACTIVE_FARM_KEY = "aquasmart_active_farm_id";
const ACTIVE_POND_KEY = "aquasmart_active_pond_id";

const env = import.meta.env as Record<string, string | undefined>;

export const DEFAULT_POND_ID = env.VITE_DEFAULT_POND_ID ?? "cage_001";

function isBrowser() {
  return typeof window !== "undefined";
}

function scopedKey(base: string, userId: string) {
  return `${base}:${userId}`;
}

function farmIdForUser(userId: string) {
  const safeId = userId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeId ? `user_${safeId}` : "";
}

export function getUserDefaultFarmId() {
  const user = getSessionUser();
  if (!user) return "";
  return farmIdForUser(user.id);
}

export function getActiveFarmId() {
  const user = getSessionUser();
  if (!user) return "";
  return farmIdForUser(user.id);
}

export function setActiveFarmId(_farmId: string) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(scopedKey(ACTIVE_FARM_KEY, user.id), farmIdForUser(user.id));
}

export function getActivePondId() {
  const user = getSessionUser();
  if (!user) return "";
  if (!isBrowser()) return DEFAULT_POND_ID;
  return window.localStorage.getItem(scopedKey(ACTIVE_POND_KEY, user.id)) ?? DEFAULT_POND_ID;
}

export function setActivePondId(pondId: string) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(scopedKey(ACTIVE_POND_KEY, user.id), pondId);
}
