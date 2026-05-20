import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/supabase/client";

export type SessionUser = {
  id: string;
  email: string;
};

const SESSION_KEY = "aquasmart_session_v2";

function isBrowser() {
  return typeof window !== "undefined";
}

function setSession(access_token: string, user: SessionUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ access_token, user }));
}

export function getSessionUser(): SessionUser | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { user?: SessionUser };
    return parsed.user ?? null;
  } catch {
    return null;
  }
}

export function logoutUser() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

async function authRequest(path: string, body: Record<string, unknown>) {
  if (!hasSupabaseConfig()) {
    return { ok: false as const, message: "Supabase auth is not configured." };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return {
      ok: false as const,
      message: String(payload.msg ?? payload.error_description ?? "Authentication failed."),
    };
  }

  return { ok: true as const, payload };
}

export async function registerUser(name: string, email: string, password: string) {
  const result = await authRequest("signup", {
    email: email.trim().toLowerCase(),
    password,
    data: { full_name: name.trim() },
  });

  if (!result.ok) return result;
  return { ok: true as const };
}

export async function loginUser(email: string, password: string) {
  const result = await authRequest("token?grant_type=password", {
    email: email.trim().toLowerCase(),
    password,
  });

  if (!result.ok) return result;

  const access_token = String(result.payload.access_token ?? "");
  const userObj = (result.payload.user ?? {}) as Record<string, unknown>;
  const user = {
    id: String(userObj.id ?? ""),
    email: String(userObj.email ?? email.trim().toLowerCase()),
  };

  if (!access_token || !user.id) {
    return { ok: false as const, message: "Auth response missing session data." };
  }

  setSession(access_token, user);
  return { ok: true as const };
}

export async function forgotPassword(email: string) {
  const result = await authRequest("recover", { email: email.trim().toLowerCase() });
  if (!result.ok) return result;
  return { ok: true as const };
}
