import { firstDefined, getEnvRecord, jsonResponse } from "@/lib/iot-firebase";

export type AppUserRole = "admin" | "farm_user";

export type AuthorizedUser = {
  id: string;
  email: string;
  role: AppUserRole;
  farmId: string;
};

function safeFarmIdForUser(userId: string) {
  const safeId = userId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeId ? `user_${safeId}` : "";
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function getSupabaseAuthConfig(env: unknown) {
  const envRecord = getEnvRecord(env);
  return {
    url: firstDefined([envRecord.VITE_SUPABASE_URL, envRecord.SUPABASE_URL]),
    anonKey: firstDefined([envRecord.VITE_SUPABASE_ANON_KEY, envRecord.SUPABASE_ANON_KEY]),
  };
}

function normalizeRole(rawRole: unknown): AppUserRole {
  return rawRole === "admin" ? "admin" : "farm_user";
}

function isEmailVerified(payload: Record<string, unknown>) {
  return Boolean(payload.email_confirmed_at || payload.confirmed_at || payload.email_verified);
}

export async function getAuthorizedUser(
  request: Request,
  env: unknown,
): Promise<{ ok: true; user: AuthorizedUser } | { ok: false; response: Response }> {
  const token = bearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, message: "Authentication required." }, 401, {
        "cache-control": "no-store",
      }),
    };
  }

  const { url, anonKey } = getSupabaseAuthConfig(env);
  if (!url || !anonKey) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, message: "Supabase auth is not configured for protected IoT routes." },
        500,
        { "cache-control": "no-store" },
      ),
    };
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, message: "Invalid or expired session." }, 401, {
        "cache-control": "no-store",
      }),
    };
  }

  const id = String(payload.id ?? "");
  const email = String(payload.email ?? "");
  const userMetadata =
    payload.user_metadata && typeof payload.user_metadata === "object"
      ? (payload.user_metadata as Record<string, unknown>)
      : {};
  const appMetadata =
    payload.app_metadata && typeof payload.app_metadata === "object"
      ? (payload.app_metadata as Record<string, unknown>)
      : {};
  if (!isEmailVerified(payload)) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, message: "Verified email required." }, 403, {
        "cache-control": "no-store",
      }),
    };
  }

  const role = normalizeRole(appMetadata.role ?? userMetadata.role);

  if (!id || !email) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, message: "Invalid user profile." }, 401, {
        "cache-control": "no-store",
      }),
    };
  }

  return { ok: true, user: { id, email, role, farmId: safeFarmIdForUser(id) } };
}

export function requireAdmin(user: AuthorizedUser): Response | null {
  if (user.role === "admin") return null;
  return jsonResponse({ ok: false, message: "Admin role required." }, 403, {
    "cache-control": "no-store",
  });
}

export function requireFarmAccess(user: AuthorizedUser, farmId: string): Response | null {
  if (user.role === "admin" || farmId === user.farmId) return null;
  return jsonResponse({ ok: false, message: "Forbidden for this farm." }, 403, {
    "cache-control": "no-store",
  });
}
