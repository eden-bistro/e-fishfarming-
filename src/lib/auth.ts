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
  password: string;
  farm?: FarmProfile;
};

const USERS_KEY = "aquasmart_users";
const SESSION_KEY = "aquasmart_session";

function isBrowser() {
  return typeof window !== "undefined";
}

export function listUsers(): AuthUser[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AuthUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: AuthUser[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(name: string, email: string, password: string): { ok: true } | { ok: false; message: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const users = listUsers();
  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { ok: false, message: "Email already registered." };
  }
  users.push({ id: crypto.randomUUID(), name: name.trim(), email: normalizedEmail, password });
  saveUsers(users);
  return { ok: true };
}

export function loginUser(email: string, password: string): { ok: true } | { ok: false; message: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = listUsers().find((u) => u.email.toLowerCase() === normalizedEmail && u.password === password);
  if (!user) return { ok: false, message: "Invalid email or password." };
  if (isBrowser()) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
  }
  return { ok: true };
}

export function logoutUser() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getSessionUser(): { id: string; name: string; email: string } | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as { id: string; name: string; email: string };
    if (!user?.id || !user?.email) return null;
    return user;
  } catch {
    return null;
  }
}

export function getCurrentUserRecord(): AuthUser | null {
  const session = getSessionUser();
  if (!session) return null;
  return listUsers().find((u) => u.id === session.id) ?? null;
}

export function saveCurrentUserFarm(farm: FarmProfile): { ok: true } | { ok: false; message: string } {
  const current = getCurrentUserRecord();
  if (!current) return { ok: false, message: "No authenticated user." };

  const users = listUsers();
  const ix = users.findIndex((u) => u.id === current.id);
  if (ix < 0) return { ok: false, message: "Current user not found." };

  users[ix] = { ...users[ix], farm };
  saveUsers(users);
  return { ok: true };
}
