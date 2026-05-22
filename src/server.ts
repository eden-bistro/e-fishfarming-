import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
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

  if (!expectedToken) {
    return jsonResponse({ ok: false, message: "IOT_INGEST_TOKEN is not configured." }, 500);
  }
  if (!firebaseBaseUrl) {
    return jsonResponse(
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
    return jsonResponse({ ok: false, message: "Unauthorized ingest token." }, 401);
  }

  const firebaseDatabaseSecret = firstDefined([
    envRecord.FIREBASE_DATABASE_SECRET,
    envRecord.FIREBASE_AUTH_TOKEN,
  ]);
  const firebaseAuthSource = envRecord.FIREBASE_DATABASE_SECRET
    ? "FIREBASE_DATABASE_SECRET"
    : envRecord.FIREBASE_AUTH_TOKEN
      ? "FIREBASE_AUTH_TOKEN"
      : undefined;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400);
  }

  const farmId = String(body.farmId ?? "default").trim();
  const pondId = String(body.pondId ?? body.cageId ?? "pond-a").trim();
  const deviceId = String(body.deviceId ?? "").trim();
  const timestamp = String(body.timestamp ?? new Date().toISOString());
  const temperature = Number(body.temperature);
  const ph = Number(body.ph);
  const dissolvedOxygen = Number(body.dissolvedOxygen);
  const ammonia = Number(body.ammonia);

  if (!deviceId || !Number.isFinite(temperature) || !Number.isFinite(ph)) {
    return jsonResponse({ ok: false, message: "deviceId, temperature and ph are required." }, 400);
  }

  const basePath = `${firebaseBaseUrl}/farms/${encodeURIComponent(farmId)}/ponds/${encodeURIComponent(pondId)}`;
  const withAuth = (url: string) => {
    if (!firebaseDatabaseSecret) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}auth=${encodeURIComponent(firebaseDatabaseSecret)}`;
  };

  const write = async (
    path: string,
    payload: unknown,
    method: "PUT" | "POST" = "PUT",
    allowFailure = false,
  ) => {
    const url = withAuth(`${basePath}/${path}.json`);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;

    const responseBody = await res.text();
    const shortBody = responseBody.slice(0, 200);
    const permissionDenied = res.status === 401 && /permission denied/i.test(responseBody);
    const authHint = permissionDenied
      ? ` Hint: RTDB rejected auth for ${path}. Verify ${firebaseAuthSource ?? "FIREBASE_DATABASE_SECRET/FIREBASE_AUTH_TOKEN"} is set to a valid token/secret and compatible with your RTDB rules.`
      : "";
    const error = new Error(`write failed for ${path} (${res.status}): ${shortBody}${authHint}`);
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
      hasFirebaseAuthToken: Boolean(firebaseDatabaseSecret),
      error,
    });
    return jsonResponse(
      {
        ok: false,
        message: "Failed to write ingest payload.",
        failedStep: path,
        detail: error instanceof Error ? error.message : String(error),
        hasFirebaseAuthToken: Boolean(firebaseDatabaseSecret),
        firebaseAuthSource,
      },
      502,
    );
  };

  try {
    await write("water/latest", {
      timestamp,
      pondId,
      temperature,
      ph,
      dissolvedOxygen: Number.isFinite(dissolvedOxygen) ? dissolvedOxygen : 0,
      turbidity: Number(body.turbidity ?? 0) || 0,
      ammonia: Number.isFinite(ammonia) ? ammonia : 0,
      nitrite: Number(body.nitrite ?? 0) || 0,
    });
  } catch (error) {
    return fail("water/latest", error);
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

  return jsonResponse({ ok: true, farmId, pondId, deviceId, timestamp });
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

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
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
    if (url.pathname === "/api/health/env") {
      return envHealthResponse(env);
    }
    if (url.pathname === "/api/iot/ingest" && request.method === "POST") {
      return handleIotIngest(request, env);
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
