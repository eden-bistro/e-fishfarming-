import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

function getEnvRecord(env: unknown): Record<string, string | undefined> {
  if (!env || typeof env !== "object") return {};
  return env as Record<string, string | undefined>;
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
  ]);

  if (!expectedToken) {
    return jsonResponse({ ok: false, message: "IOT_INGEST_TOKEN is not configured." }, 500);
  }
  if (!firebaseBaseUrl) {
    return jsonResponse({ ok: false, message: "Firebase URL is not configured." }, 500);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const incomingToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!incomingToken || incomingToken !== expectedToken) {
    return jsonResponse({ ok: false, message: "Unauthorized ingest token." }, 401);
  }

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
  const write = async (path: string, payload: unknown, method: "PUT" | "POST" = "PUT") => {
    const res = await fetch(`${basePath}/${path}.json`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`${path} write failed: ${res.status}`);
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

    await write(`devices/status/${encodeURIComponent(deviceId)}`, {
      firmware: String(body.firmware ?? "unknown"),
      online: true,
      rssi: Number(body.rssi ?? 0) || 0,
      freeHeap: Number(body.freeHeap ?? 0) || 0,
      updatedAt: timestamp,
    });

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
      );
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, message: "Failed to write ingest payload." }, 502);
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
