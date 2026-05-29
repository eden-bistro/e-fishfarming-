import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/supabase/client";

export type SessionUser = {
  id: string;
  email: string;
};

const SESSION_KEY = "aquasmart_session_v3";
const REFRESH_WINDOW_MS = 60_000;

type SessionRecord = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SessionUser;
  savedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function setSession(
  access_token: string,
  user: SessionUser,
  refresh_token?: string,
  expires_in?: number,
) {
  if (!isBrowser()) return;
  const expires_at = expires_in ? Date.now() + expires_in * 1000 : undefined;
  window.sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      access_token,
      refresh_token,
      expires_at,
      user,
      savedAt: Date.now(),
    } satisfies SessionRecord),
  );
}

function getSessionRecord(): SessionRecord | null {
  if (!isBrowser()) return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  return getSessionRecord()?.user ?? null;
}

export async function getAccessToken(): Promise<string | null> {
  const session = getSessionRecord();
  if (!session?.access_token) return null;
  if (!session.expires_at || session.expires_at - Date.now() > REFRESH_WINDOW_MS) {
    return session.access_token;
  }
  if (!session.refresh_token || !hasSupabaseConfig()) return session.access_token;

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!response.ok) return session.access_token;
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const access_token = String(payload.access_token ?? "");
  const refresh_token = String(payload.refresh_token ?? session.refresh_token ?? "");
  const expires_in = Number(payload.expires_in ?? 0);
  if (!access_token) return session.access_token;
  setSession(access_token, session.user, refresh_token, expires_in);
  return access_token;
}

export function logoutUser() {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(SESSION_KEY);
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

  const access_token = String(result.payload.access_token ?? "");
  const userObj = (result.payload.user ?? {}) as Record<string, unknown>;
  const user = {
    id: String(userObj.id ?? ""),
    email: String(userObj.email ?? email.trim().toLowerCase()),
  };

  const refresh_token = String(result.payload.refresh_token ?? "");
  const expires_in = Number(result.payload.expires_in ?? 0);
  if (access_token && user.id) {
    setSession(access_token, user, refresh_token, expires_in);
    return { ok: true as const, autoSignedIn: true as const };
  }

  return {
    ok: false as const,
    message:
      "Email confirmation is enabled in Supabase. Disable 'Confirm email' in Supabase Auth settings to allow instant registration.",
  };
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

  const refresh_token = String(result.payload.refresh_token ?? "");
  const expires_in = Number(result.payload.expires_in ?? 0);
  setSession(access_token, user, refresh_token, expires_in);
  return { ok: true as const };
}

export async function forgotPassword(email: string) {
  const result = await authRequest("recover", { email: email.trim().toLowerCase() });
  if (!result.ok) return result;
  return { ok: true as const };
}
