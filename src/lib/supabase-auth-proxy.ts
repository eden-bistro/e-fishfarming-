type AuthAction = "login" | "register" | "recover" | "refresh";

function getEnvRecord(env: unknown): Record<string, string | undefined> {
  const runtime =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  if (!env || typeof env !== "object") return runtime;
  return { ...runtime, ...(env as Record<string, string | undefined>) };
}

function firstDefined(values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

export function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function getSupabaseAuthConfig(env: unknown) {
  const envRecord = getEnvRecord(env);
  const url = firstDefined([envRecord.VITE_SUPABASE_URL, envRecord.SUPABASE_URL]);
  const anonKey = firstDefined([envRecord.VITE_SUPABASE_ANON_KEY, envRecord.SUPABASE_ANON_KEY]);
  return { url, anonKey };
}

function supabaseConfigError(env: unknown): Response | null {
  const { url, anonKey } = getSupabaseAuthConfig(env);
  const missing = [];
  if (!url) missing.push("VITE_SUPABASE_URL or SUPABASE_URL");
  if (!anonKey) missing.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY");
  if (missing.length === 0) return null;
  return jsonResponse(
    {
      ok: false,
      message: `Supabase auth is not configured. Missing: ${missing.join(", ")}.`,
    },
    500,
  );
}

function normalizeAuthAction(action: string): AuthAction | null {
  if (action === "login" || action === "register" || action === "recover" || action === "refresh") {
    return action;
  }
  return null;
}

export async function handleSupabaseAuthProxy(request: Request, env: unknown, action: string) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed for auth endpoint." }, 405, {
      allow: "POST",
    });
  }

  const authAction = normalizeAuthAction(action);
  if (!authAction) {
    return jsonResponse({ ok: false, message: "Unknown auth action." }, 404);
  }

  const configError = supabaseConfigError(env);
  if (configError) return configError;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400);
  }

  const pathByAction: Record<AuthAction, string> = {
    login: "token?grant_type=password",
    register: "signup",
    recover: "recover",
    refresh: "token?grant_type=refresh_token",
  };

  const { url, anonKey } = getSupabaseAuthConfig(env);
  const response = await fetch(`${url}/auth/v1/${pathByAction[authAction]}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anonKey!,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    return jsonResponse(
      {
        ok: false,
        message: String(payload.msg ?? payload.error_description ?? "Authentication failed."),
      },
      response.status,
    );
  }

  return jsonResponse({ ok: true, payload });
}
