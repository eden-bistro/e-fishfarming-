export type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
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
