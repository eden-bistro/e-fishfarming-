import {
  encodedFarmPondPath,
  getDefaultFarmId,
  getDefaultPondId,
  jsonResponse,
  noContentResponse,
  firebaseDatabaseHeaders,
  firebaseDatabaseUrl,
  resolveFirebaseDatabase,
  writeFirebaseJson,
} from "@/lib/iot-firebase";
import { getAuthorizedUser, requireFarmAccess } from "@/lib/server-authz";

export type IotFeedingCommand = {
  id: string;
  action: "dispense_feed";
  amountKg: number;
  targetPondId: string;
  requestedBy: string;
  requestedAt: string;
  status: "queued" | "ack" | "done" | "failed";
};

function commandPath(farmId: string, pondId: string) {
  return `${encodedFarmPondPath(farmId, pondId)}/feeding/commands`;
}

function normalizeCommandBody(body: Record<string, unknown>): Omit<IotFeedingCommand, "id"> | null {
  const action = body.action === "dispense_feed" ? body.action : "dispense_feed";
  const amountKg = Number(body.amountKg);
  const targetPondId = String(body.targetPondId ?? body.pondId ?? "").trim();
  const requestedBy = String(body.requestedBy ?? "operator").trim();

  if (!Number.isFinite(amountKg) || amountKg <= 0 || !targetPondId || !requestedBy) {
    return null;
  }

  return {
    action,
    amountKg,
    targetPondId,
    requestedBy,
    requestedAt: new Date().toISOString(),
    status: "queued",
  };
}

export async function handleIotFeedingCommand(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "GET, POST, HEAD, OPTIONS",
      "access-control-allow-methods": "GET, POST, HEAD, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed for feeding commands." }, 405, {
      allow: "GET, POST, HEAD, OPTIONS",
    });
  }

  const authz = await getAuthorizedUser(request, env);
  if (!authz.ok) return authz.response;

  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) return firebase.response;

  const url = new URL(request.url);
  const farmId = (url.searchParams.get("farmId") || getDefaultFarmId(env)).trim();
  const pondId = (url.searchParams.get("pondId") || getDefaultPondId(env)).trim();
  if (!farmId || !pondId) {
    return jsonResponse({ ok: false, message: "farmId and pondId are required." }, 400, {
      "cache-control": "no-store",
    });
  }

  const forbidden = requireFarmAccess(authz.user, farmId);
  if (forbidden) return forbidden;

  if (request.method === "GET" || request.method === "HEAD") {
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100));
    const readUrl = new URL(
      firebaseDatabaseUrl(firebase.baseUrl, commandPath(farmId, pondId), firebase.auth),
    );
    readUrl.searchParams.set("orderBy", '"$key"');
    readUrl.searchParams.set("limitToLast", String(limit));
    const response = await fetch(readUrl, {
      method: "GET",
      headers: firebaseDatabaseHeaders(firebase.auth),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return jsonResponse(
        {
          ok: false,
          message: "Failed to read feeding commands.",
          status: response.status,
          detail: detail.slice(0, 200),
        },
        response.status === 404 ? 404 : 502,
        { "cache-control": "no-store" },
      );
    }

    const raw = (await response.json().catch(() => null)) as Record<
      string,
      Omit<IotFeedingCommand, "id">
    > | null;
    const commands =
      raw && typeof raw === "object"
        ? Object.entries(raw)
            .map(([id, value]) => ({ id, ...value }))
            .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))
        : [];
    return jsonResponse({ ok: true, farmId, pondId, commands }, 200, {
      "cache-control": "no-store",
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400, {
      "cache-control": "no-store",
    });
  }

  const command = normalizeCommandBody(body);
  if (!command) {
    return jsonResponse(
      { ok: false, message: "targetPondId, requestedBy and a positive amountKg are required." },
      400,
      { "cache-control": "no-store" },
    );
  }

  const response = await writeFirebaseJson(
    firebase.baseUrl,
    commandPath(farmId, pondId),
    firebase.auth,
    command,
    "POST",
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return jsonResponse(
      {
        ok: false,
        message: "Failed to queue feeding command.",
        status: response.status,
        detail: detail.slice(0, 200),
      },
      response.status === 401 || response.status === 403 ? 502 : response.status,
      { "cache-control": "no-store" },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as { name?: string };
  return jsonResponse({ ok: true, farmId, pondId, id: String(payload.name ?? ""), command }, 200, {
    "cache-control": "no-store",
  });
}
