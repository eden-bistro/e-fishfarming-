import {
  forgotPassword as forgotPasswordService,
  getSessionUser as getSessionUserService,
  loginUser as loginUserService,
  logoutUser as logoutUserService,
  registerUser as registerUserService,
  type SessionUser,
} from "@/services/auth.service";

export type FarmProfile = {
  name: string;
  location: string;
  owner: string;
  currency: string;
  totalPonds: number | null;
  totalStockKg: number | null;
};

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
  return [{ id: session.id, name: session.email, email: session.email, farm: getCurrentUserRecord()?.farm }];
}

export function getCurrentUserRecord(): AuthUser | null {
  const session = getSessionUser();
  if (!session || !isBrowser()) return null;
  const raw = window.localStorage.getItem(`${FARM_KEY}:${session.id}`);
  const farm = raw ? (JSON.parse(raw) as FarmProfile) : undefined;
  return { id: session.id, email: session.email, name: session.email, farm };
}

export function saveCurrentUserFarm(farm: FarmProfile): { ok: true } | { ok: false; message: string } {
  const current = getCurrentUserRecord();
  if (!current || !isBrowser()) return { ok: false, message: "No authenticated user." };
  window.localStorage.setItem(`${FARM_KEY}:${current.id}`, JSON.stringify(farm));
  return { ok: true };
}
