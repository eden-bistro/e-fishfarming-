import { getSessionUser } from "@/lib/auth";

const ACTIVE_FARM_KEY = "aquasmart_active_farm_id";
const ACTIVE_POND_KEY = "aquasmart_active_pond_id";

const env = import.meta.env as Record<string, string | undefined>;

export const DEFAULT_FARM_ID = env.VITE_DEFAULT_FARM_ID ?? "default";
export const DEFAULT_POND_ID = env.VITE_DEFAULT_POND_ID ?? "pond-a";

function isBrowser() {
  return typeof window !== "undefined";
}

function scopedKey(base: string, userId: string) {
  return `${base}:${userId}`;
}

export function getActiveFarmId() {
  const user = getSessionUser();
  if (!user || !isBrowser()) return DEFAULT_FARM_ID;
  return window.localStorage.getItem(scopedKey(ACTIVE_FARM_KEY, user.id)) ?? DEFAULT_FARM_ID;
}

export function setActiveFarmId(farmId: string) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(scopedKey(ACTIVE_FARM_KEY, user.id), farmId);
}

export function getActivePondId() {
  const user = getSessionUser();
  if (!user || !isBrowser()) return DEFAULT_POND_ID;
  return window.localStorage.getItem(scopedKey(ACTIVE_POND_KEY, user.id)) ?? DEFAULT_POND_ID;
}

export function setActivePondId(pondId: string) {
  const user = getSessionUser();
  if (!user || !isBrowser()) return;
  window.localStorage.setItem(scopedKey(ACTIVE_POND_KEY, user.id), pondId);
}
