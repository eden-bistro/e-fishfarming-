import {
  encodedFarmPondPath,
  firstDefined,
  getDefaultPondId,
  getEnvRecord,
  jsonResponse,
  noContentResponse,
  resolveFirebaseDatabase,
  type FirebaseDatabaseAuth,
  writeFirebaseJson,
} from "@/lib/iot-firebase";
import { getAuthorizedUser, requireAdmin } from "@/lib/server-authz";

function setupToken(request: Request): string {
  const explicit = request.headers.get("x-iot-setup-token")?.trim();
  if (explicit) return explicit;
  const header = request.headers.get("authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function requireSetupToken(request: Request, env: unknown): Response | null {
  const expected = firstDefined([
    getEnvRecord(env).IOT_SETUP_TOKEN,
    getEnvRecord(env).IOT_INGEST_TOKEN,
  ]);
  if (!expected) {
    return jsonResponse(
      {
        ok: false,
        message: "IoT setup token is not configured. Set IOT_SETUP_TOKEN or IOT_INGEST_TOKEN.",
      },
      500,
      { "cache-control": "no-store" },
    );
  }

  if (setupToken(request) !== expected) {
    return jsonResponse({ ok: false, message: "Unauthorized." }, 401, {
      "cache-control": "no-store",
    });
  }
  return null;
}

async function writeRequired(
  baseUrl: string,
  path: string,
  auth: FirebaseDatabaseAuth,
  payload: unknown,
  method: "PUT" | "PATCH" = "PATCH",
) {
  const response = await writeFirebaseJson(baseUrl, path, auth, payload, method);
  if (response.ok) return;
  const detail = await response.text().catch(() => "");
  throw new Error(`write failed for ${path} (${response.status}): ${detail.slice(0, 200)}`);
}

export async function handleIotSetup(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "POST, OPTIONS",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, x-iot-setup-token",
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed for IoT setup." }, 405, {
      allow: "POST, OPTIONS",
    });
  }

  const authz = await getAuthorizedUser(request, env);
  if (!authz.ok) return authz.response;
  const nonAdmin = requireAdmin(authz.user);
  if (nonAdmin) return nonAdmin;

  const unauthorized = requireSetupToken(request, env);
  if (unauthorized) return unauthorized;

  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) return firebase.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400, {
      "cache-control": "no-store",
    });
  }

  const now = new Date().toISOString();
  const farmId = String(body.farmId ?? "").trim();
  const pondId = String(body.pondId ?? body.cageId ?? getDefaultPondId(env)).trim();
  const deviceId = String(body.deviceId ?? "").trim();
  const farmName = String(body.farmName ?? "Default Farm").trim();
  const cageName = String(body.cageName ?? body.pondName ?? pondId).trim();
  const firmware = String(body.firmware ?? "unknown").trim();

  if (!farmId || !pondId || !deviceId) {
    return jsonResponse(
      { ok: false, message: "farmId, pondId/cageId and deviceId are required." },
      400,
      {
        "cache-control": "no-store",
      },
    );
  }

  const basePath = encodedFarmPondPath(farmId, pondId);
  try {
    await writeRequired(
      firebase.baseUrl,
      `farms/${encodeURIComponent(farmId)}/metadata`,
      firebase.auth,
      {
        farmId,
        name: farmName,
        updatedAt: now,
      },
    );
    await writeRequired(firebase.baseUrl, `${basePath}/metadata`, firebase.auth, {
      pondId,
      cageId: pondId,
      name: cageName,
      status: "active",
      updatedAt: now,
      deviceIds: { [deviceId]: true },
    });
    await writeRequired(
      firebase.baseUrl,
      `${basePath}/devices/registry/${encodeURIComponent(deviceId)}`,
      firebase.auth,
      {
        deviceId,
        farmId,
        pondId,
        cageId: pondId,
        firmware,
        status: "assigned",
        updatedAt: now,
      },
    );
    await writeRequired(
      firebase.baseUrl,
      `${basePath}/devices/status/${encodeURIComponent(deviceId)}`,
      firebase.auth,
      {
        firmware,
        online: false,
        updatedAt: now,
      },
    );
    await writeRequired(
      firebase.baseUrl,
      `farms/${encodeURIComponent(farmId)}/devices/${encodeURIComponent(deviceId)}`,
      firebase.auth,
      {
        deviceId,
        pondId,
        cageId: pondId,
        firmware,
        status: "assigned",
        updatedAt: now,
      },
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: "Failed to create farm/cage/device metadata.",
        detail: error instanceof Error ? error.message : String(error),
      },
      502,
      { "cache-control": "no-store" },
    );
  }

  return jsonResponse(
    {
      ok: true,
      farmId,
      pondId,
      cageId: pondId,
      deviceId,
      paths: {
        farm: `/farms/${farmId}/metadata`,
        cage: `/farms/${farmId}/ponds/${pondId}/metadata`,
        deviceRegistry: `/farms/${farmId}/ponds/${pondId}/devices/registry/${deviceId}`,
        deviceStatus: `/farms/${farmId}/ponds/${pondId}/devices/status/${deviceId}`,
        latestWater: `/farms/${farmId}/ponds/${pondId}/water/latest`,
      },
    },
    200,
    { "cache-control": "no-store" },
  );
}
