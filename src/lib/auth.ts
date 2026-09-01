import {
  forgotPassword as forgotPasswordService,
  getSessionUser as getSessionUserService,
  loginUser as loginUserService,
  logoutUser as logoutUserService,
  registerUser as registerUserService,
  type SessionUser,
} from "@/services/auth.service";
import {
  farmProfileBackendAvailable,
  fetchFarmProfileRemote,
  saveFarmProfileRemote,
} from "@/services/farm-profile.service";
import type { FarmProfile } from "@/lib/farm-profile";

export type { FarmProfile } from "@/lib/farm-profile";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  farm?: FarmProfile;
};

const FARM_KEY = "aquasmart_farm_profile";

function isBrowser() {
  return typeof window !== "undefined";
}

export async function registerUser(name: string, email: string, password: string) {
  return registerUserService(name, email, password);
}

export async function loginUser(email: string, password: string) {
  return loginUserService(email, password);
}

export async function forgotPassword(email: string) {
  return forgotPasswordService(email);
}

export function logoutUser() {
  logoutUserService();
}

export function getSessionUser(): (SessionUser & { name?: string }) | null {
  return getSessionUserService();
}

export function listUsers(): AuthUser[] {
  const session = getSessionUser();
  if (!session) return [];
  return [
    {
      id: session.id,
      name: session.email,
      email: session.email,
      farm: getCurrentUserRecord()?.farm,
    },
  ];
}

export function getCurrentUserRecord(): AuthUser | null {
  const session = getSessionUser();
  if (!session || !isBrowser()) return null;
  const farm = getCachedFarmProfile(session.id);
  return { id: session.id, email: session.email, name: session.email, farm };
}

function cacheCurrentUserFarm(userId: string, farm: FarmProfile) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(`${FARM_KEY}:${userId}`, JSON.stringify(farm));
  } catch {
    // Keep the profile available through the remote backend when local storage is unavailable.
  }
}

function getCachedFarmProfile(userId: string): FarmProfile | undefined {
  if (!isBrowser()) return undefined;

  try {
    const raw = window.localStorage.getItem(`${FARM_KEY}:${userId}`);
    if (!raw) return undefined;

    const profile = JSON.parse(raw) as Partial<FarmProfile>;
    if (
      typeof profile.name !== "string" ||
      typeof profile.location !== "string" ||
      typeof profile.owner !== "string" ||
      typeof profile.currency !== "string" ||
      (profile.totalPonds !== null && typeof profile.totalPonds !== "number") ||
      (profile.totalStockKg !== null && typeof profile.totalStockKg !== "number")
    ) {
      return undefined;
    }

    return profile as FarmProfile;
  } catch {
    // A malformed or unavailable local-storage entry must not prevent dashboard rendering.
    return undefined;
  }
}

export async function loadCurrentUserFarmProfile(): Promise<FarmProfile | null> {
  const session = getSessionUser();
  if (!session) return null;

  const localFarm = getCurrentUserRecord()?.farm ?? null;
  const remoteFarm = await fetchFarmProfileRemote();
  if (remoteFarm) {
    cacheCurrentUserFarm(session.id, remoteFarm);
    return remoteFarm;
  }

  if (localFarm) {
    await saveFarmProfileRemote(localFarm);
  }

  return localFarm;
}

export async function saveCurrentUserFarm(
  farm: FarmProfile,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const current = getCurrentUserRecord();
  if (!current || !isBrowser()) return { ok: false, message: "No authenticated user." };
  cacheCurrentUserFarm(current.id, farm);
  const synced = await saveFarmProfileRemote(farm);
  if (!synced && farmProfileBackendAvailable()) {
    return {
      ok: false,
      message:
        "Farm profile was saved on this device but could not sync to your account. Please try again before using another device.",
    };
  }
  return { ok: true };
}
