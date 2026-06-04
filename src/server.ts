import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleSupabaseAuthProxy, jsonResponse } from "./lib/supabase-auth-proxy";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

type FirebaseWriteAuth =
  | { type: "database-secret"; token: string }
  | { type: "oauth"; token: string }
  | { type: "none" };

let serverEntryPromise: Promise<ServerEntry> | undefined;

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

function envHealthResponse(env: unknown): Response {
  const envRecord = getEnvRecord(env);
  const required = {
    SUPABASE_URL: firstDefined([envRecord.VITE_SUPABASE_URL, envRecord.SUPABASE_URL]),
    SUPABASE_ANON_KEY: firstDefined([
      envRecord.VITE_SUPABASE_ANON_KEY,
      envRecord.SUPABASE_ANON_KEY,
    ]),
    FIREBASE_DATABASE_URL: firstDefined([
      envRecord.VITE_FIREBASE_DATABASE_URL,
      envRecord.FIREBASE_DATABASE_URL,
      envRecord.FIREBASE_URL,
    ]),
    IOT_INGEST_TOKEN: envRecord.IOT_INGEST_TOKEN,
    FIREBASE_WRITE_AUTH: firstDefined([
      envRecord.FIREBASE_SERVICE_ACCOUNT,
      envRecord.FIREBASE_DATABASE_SECRET,
      envRecord.FIREBASE_AUTH_TOKEN,
    ]),
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return new Response(
    JSON.stringify(
      {
        ok: missing.length === 0,
        missing,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    {
      status: missing.length === 0 ? 200 : 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    },
  );
}

function jsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function serverJsonResponse(payload: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
function noContentResponse(status = 204, extraHeaders?: HeadersInit): Response {
  return new Response(null, { status, headers: extraHeaders });
}

function noContentResponse(status = 204, extraHeaders?: HeadersInit): Response {
  return new Response(null, { status, headers: extraHeaders });
}

function noContentResponse(status = 204, extraHeaders?: HeadersInit): Response {
  return new Response(null, { status, headers: extraHeaders });
}

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let account: ServiceAccount;
  try {
    account = JSON.parse(serviceAccountJson) as ServiceAccount;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid JSON.");
  }

  if (!account.client_email || !account.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT missing client_email/private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: account.client_email,
    scope:
      "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(
      atob(account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")),
      (c) => c.charCodeAt(0),
    ),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const assertion = `${signingInput}.${b64url(new Uint8Array(sig))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`OAuth token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenBody = (await tokenRes.json()) as { access_token?: string };
  if (!tokenBody.access_token) throw new Error("OAuth response missing access_token.");
  return tokenBody.access_token;
}

function isIotIngestPath(pathname: string): boolean {
  return pathname === "/api/iot/ingest" || pathname === "/ingest";
}

function faviconResponse(): Response {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0f766e"/>
  <path d="M14 34c10-12 26-12 36 0-10 12-26 12-36 0Z" fill="#ccfbf1"/>
  <circle cx="43" cy="32" r="3" fill="#0f766e"/>
  <path d="M18 46c8 3 20 3 28-1" fill="none" stroke="#67e8f9" stroke-width="4" stroke-linecap="round"/>
</svg>`,
    {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    },
  );
}

function iotIngestInfoResponse(): Response {
  return jsonResponse({
    ok: true,
    endpoint: "/api/iot/ingest",
    aliases: ["/ingest"],
    method: "POST",
    requiredHeaders: {
      authorization: "Bearer <IOT_INGEST_TOKEN>",
      "content-type": "application/json",
    },
    requiredFields: ["deviceId", "farmId", "pondId", "temperature", "ph"],
  });
}

async function handleIotIngest(request: Request, env: unknown): Promise<Response> {
  const envRecord = getEnvRecord(env);
  const expectedToken = envRecord.IOT_INGEST_TOKEN;
  const firebaseBaseUrl = firstDefined([
    envRecord.VITE_FIREBASE_DATABASE_URL,
    envRecord.FIREBASE_DATABASE_URL,
    envRecord.FIREBASE_URL,
  ]);
  const serviceAccountJson = envRecord.FIREBASE_SERVICE_ACCOUNT;

  if (!expectedToken) {
    return serverJsonResponse({ ok: false, message: "IOT_INGEST_TOKEN is not configured." }, 500);
  }

  if (!firebaseBaseUrl) {
    return serverJsonResponse(
      {
        ok: false,
        message:
          "Firebase URL is not configured. Set VITE_FIREBASE_DATABASE_URL or FIREBASE_DATABASE_URL (FIREBASE_URL alias supported).",
      },
      500,
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const incomingToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!incomingToken || incomingToken !== expectedToken) {
    return serverJsonResponse({ ok: false, message: "Unauthorized ingest token." }, 401);
  }

  const firebaseDatabaseSecret = firstDefined([
    envRecord.FIREBASE_DATABASE_SECRET,
    envRecord.FIREBASE_AUTH_TOKEN,
  ]);

  let firebaseWriteAuth: FirebaseWriteAuth = { type: "none" };
  if (firebaseDatabaseSecret) {
    firebaseWriteAuth = { type: "database-secret", token: firebaseDatabaseSecret };
  } else if (serviceAccountJson) {
    try {
      firebaseWriteAuth = { type: "oauth", token: await getGoogleAccessToken(serviceAccountJson) };
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          message: "Firebase service account authentication failed.",
          detail: error instanceof Error ? error.message : String(error),
        },
        500,
      );
    }
  } else {
    return jsonResponse(
      {
        ok: false,
        message:
          "Firebase write authentication is not configured. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_DATABASE_SECRET/FIREBASE_AUTH_TOKEN.",
      },
      500,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return serverJsonResponse({ ok: false, message: "Body must be valid JSON." }, 400);
  }

  const deviceId = String(body.deviceId ?? "").trim();
  const farmId = String(body.farmId ?? "").trim();
  const pondId = String(body.pondId ?? "").trim();
  const timestamp = String(body.timestamp ?? new Date().toISOString());
  const temperature = Number(body.temperature);
  const ph = Number(body.ph);
  const dissolvedOxygen = Number(body.dissolvedOxygen ?? 0);
  const ammonia = Number(body.ammonia ?? 0);

  if (!deviceId || !farmId || !pondId || !Number.isFinite(temperature) || !Number.isFinite(ph)) {
    return serverJsonResponse(
      { ok: false, message: "deviceId, farmId, pondId, temperature and ph are required." },
      400,
    );
  }

  const basePath = `${firebaseBaseUrl}/farms/${encodeURIComponent(farmId)}/ponds/${encodeURIComponent(pondId)}`;
  const withAuth = (url: string) => {
    if (firebaseWriteAuth.type !== "database-secret") return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}auth=${encodeURIComponent(firebaseWriteAuth.token)}`;
  };

  const write = async (
    path: string,
    payload: unknown,
    method: "PUT" | "POST" = "PUT",
    allowFailure = false,
  ) => {
    const url = withAuth(`${basePath}/${path}.json`);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (firebaseWriteAuth.type === "oauth") {
      headers.authorization = `Bearer ${firebaseWriteAuth.token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
    });
    if (res.ok) return;

    const responseBody = await res.text();
    const error = new Error(
      `write failed for ${path} (${res.status}): ${responseBody.slice(0, 200)}`,
    );
    if (allowFailure) {
      console.warn("[iot-ingest] non-blocking write failure", {
        path,
        status: res.status,
        responseBody,
      });
      return;
    }
    throw error;
  };

  const fail = (path: string, error: unknown) => {
    console.error("[iot-ingest] blocking write failure", {
      path,
      firebaseAuthType: firebaseWriteAuth.type,
      error,
    });
    return serverJsonResponse(
      {
        ok: false,
        message: "Failed to write ingest payload.",
        failedStep: path,
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  };

  const waterReading = {
    timestamp,
    pondId,
    deviceId,
    temperature,
    ph,
    dissolvedOxygen: Number.isFinite(dissolvedOxygen) ? dissolvedOxygen : 0,
    turbidity: Number(body.turbidity ?? 0) || 0,
    ammonia: Number.isFinite(ammonia) ? ammonia : 0,
    nitrite: Number(body.nitrite ?? 0) || 0,
  };

  try {
    await write("water/latest", waterReading);
  } catch (error) {
    return fail("water/latest", error);
  }

  try {
    await write("water/history", waterReading, "POST", true);
  } catch (error) {
    return fail("water/history", error);
  }

  try {
    await write(`devices/status/${encodeURIComponent(deviceId)}`, {
      firmware: String(body.firmware ?? "unknown"),
      online: true,
      rssi: Number(body.rssi ?? 0) || 0,
      freeHeap: Number(body.freeHeap ?? 0) || 0,
      updatedAt: timestamp,
    });
  } catch (error) {
    return fail("devices/status", error);
  }

  if (Number.isFinite(dissolvedOxygen) && dissolvedOxygen < 5) {
    await write(
      "alerts",
      {
        type: "low_do",
        severity: dissolvedOxygen < 4 ? "critical" : "warning",
        message: `Low dissolved oxygen detected (${dissolvedOxygen} mg/L).`,
        pond_id: pondId,
        created_at: timestamp,
      },
      "POST",
      true,
    );
  }
  if (Number.isFinite(ammonia) && ammonia > 0.05) {
    await write(
      "alerts",
      {
        type: "high_ammonia",
        severity: ammonia > 0.1 ? "critical" : "warning",
        message: `Ammonia above threshold (${ammonia} mg/L).`,
        pond_id: pondId,
        created_at: timestamp,
      },
      "POST",
      true,
    );
  }

  return jsonResponse({
    ok: true,
    deviceId,
    farmId,
    pondId,
    paths: {
      latest: `/farms/${farmId}/ponds/${pondId}/water/latest`,
      history: `/farms/${farmId}/ponds/${pondId}/water/history`,
      deviceStatus: `/farms/${farmId}/ponds/${pondId}/devices/status/${deviceId}`,
    },
  });
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === "/favicon.ico") {
      return faviconResponse();
    }
    if (url.pathname === "/api/health/env") {
      return envHealthResponse(env);
    }
    if (isIotIngestPath(url.pathname)) {
      if (request.method === "OPTIONS") {
        return noContentResponse(204, {
          allow: "GET, POST, OPTIONS",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "authorization, content-type",
        });
      }
      if (request.method === "GET" || request.method === "HEAD") {
        return iotIngestInfoResponse();
      }
      if (request.method === "POST") {
        return handleIotIngest(request, env);
      }
      return jsonResponse({ ok: false, message: "Method not allowed for IoT ingest." }, 405, {
        allow: "GET, POST, OPTIONS",
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
