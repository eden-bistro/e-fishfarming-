import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/supabase/client";

export type SessionUser = {
  id: string;
  email: string;
};

const SESSION_KEY = "aquasmart_session_v3";
const DEVICE_ID_KEY = "aquasmart_device_id";
const REFRESH_WINDOW_MS = 60_000;
const OFFLINE_AUTH_MESSAGE =
  "You are offline. Reconnect to the internet before signing in or refreshing your session.";
const PROXY_AUTH_UNAVAILABLE_MESSAGE =
  "Authentication service is unavailable. In Cloudflare, configure SUPABASE_URL and SUPABASE_ANON_KEY as Worker variables/secrets, then redeploy.";

let refreshAccessTokenPromise: Promise<string | null> | null = null;

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

function getSessionStorage() {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
  }
}

function createDeviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getDeviceId() {
  const storage = getSessionStorage();
  if (!storage) return "server";

  const existing = storage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = createDeviceId();
  storage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function sessionKeyForDevice() {
  return `${SESSION_KEY}:${getDeviceId()}`;
}

function sessionKeysForRead() {
  const keys = [sessionKeyForDevice(), SESSION_KEY];
  return [...new Set(keys)];
}

function setSession(
  access_token: string,
  user: SessionUser,
  refresh_token?: string,
  expires_in?: number,
) {
  const storage = getSessionStorage();
  if (!storage) return;
  const expires_at = expires_in ? Date.now() + expires_in * 1000 : undefined;
  storage.setItem(
    sessionKeyForDevice(),
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
  const storage = getSessionStorage();
  if (!storage) return null;

  const deviceSessionKey = sessionKeyForDevice();
  const readKey = sessionKeysForRead().find(
    (key) => storage.getItem(key) ?? window.sessionStorage.getItem(key),
  );
  if (!readKey) return null;

  const raw = storage.getItem(readKey) ?? window.sessionStorage.getItem(readKey);
  if (!raw) return null;

  if (readKey !== deviceSessionKey || !storage.getItem(deviceSessionKey)) {
    storage.setItem(deviceSessionKey, raw);
    storage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  try {
    return JSON.parse(raw) as SessionRecord;
  } catch {
    sessionKeysForRead().forEach((key) => storage.removeItem(key));
    sessionKeysForRead().forEach((key) => window.sessionStorage.removeItem(key));
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
  if (!session.refresh_token) return session.access_token;

  refreshAccessTokenPromise ??= refreshAccessToken(session).finally(() => {
    refreshAccessTokenPromise = null;
  });

  return refreshAccessTokenPromise;
}

async function refreshAccessToken(session: SessionRecord): Promise<string | null> {
  const result = await authRequest("refresh", "token?grant_type=refresh_token", {
    refresh_token: session.refresh_token,
  });
  if (!result.ok) return session.access_token;
  const payload = result.payload;
  const access_token = String(payload.access_token ?? "");
  const refresh_token = String(payload.refresh_token ?? session.refresh_token ?? "");
  const expires_in = Number(payload.expires_in ?? 0);
  if (!access_token) return session.access_token;
  setSession(access_token, session.user, refresh_token, expires_in);
  return access_token;
}

export function logoutUser() {
  const storage = getSessionStorage();
  if (!storage) return;
  sessionKeysForRead().forEach((key) => storage.removeItem(key));
  if (isBrowser()) {
    sessionKeysForRead().forEach((key) => window.sessionStorage.removeItem(key));
  }
}

function canUseDirectSupabaseAuth() {
  return hasSupabaseConfig();
}

function isOffline() {
  return isBrowser() && "onLine" in navigator && !navigator.onLine;
}

async function directSupabaseAuthRequest(path: string, body: Record<string, unknown>) {
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

async function authRequest(
  action: "login" | "register" | "recover" | "refresh",
  directPath: string,
  body: Record<string, unknown>,
) {
  if (isBrowser() && action === "refresh" && canUseDirectSupabaseAuth()) {
    return directSupabaseAuthRequest(directPath, body);
  }

  if (isBrowser()) {
    try {
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.status !== 404) {
        const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok || result.ok === false) {
          const message = String(result.message ?? "Authentication failed.");
          if (
            hasSupabaseConfig() &&
            (response.status >= 500 || message.includes("Supabase auth is not configured"))
          ) {
            return directSupabaseAuthRequest(directPath, body);
          }
          return {
            ok: false as const,
            message,
          };
        }
        return { ok: true as const, payload: (result.payload ?? {}) as Record<string, unknown> };
      }
    } catch {
      // Fall back to direct Supabase Auth below for static/local environments.
    }
  }

  return directSupabaseAuthRequest(directPath, body);
}

export async function registerUser(name: string, email: string, password: string) {
  const result = await authRequest("register", "signup", {
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
  const result = await authRequest("login", "token?grant_type=password", {
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
  const result = await authRequest("recover", "recover", { email: email.trim().toLowerCase() });
  if (!result.ok) return result;
  return { ok: true as const };
}
