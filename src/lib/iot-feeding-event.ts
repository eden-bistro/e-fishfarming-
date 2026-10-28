import {
  encodedFarmPondPath,
  jsonResponse,
  noContentResponse,
  resolveFirebaseDatabase,
  writeFirebaseJson,
} from "@/lib/iot-firebase";
import { getAuthorizedUser, requireFarmAccess } from "@/lib/server-authz";

export async function handleIotFeedingEvent(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "POST, OPTIONS",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed for feeding events." }, 405, {
      allow: "POST, OPTIONS",
    });
  }

  const authz = await getAuthorizedUser(request, env);
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const farmId = (url.searchParams.get("farmId") ?? "").trim();
  const pondId = (url.searchParams.get("pondId") ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(farmId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(pondId)) {
    return jsonResponse({ ok: false, message: "Valid farmId and pondId are required." }, 400, {
      "cache-control": "no-store",
    });
  }

  const forbidden = requireFarmAccess(authz.user, farmId);
  if (forbidden) return forbidden;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ ok: false, message: "Body must be valid JSON." }, 400, {
      "cache-control": "no-store",
    });
  }

  const amountKg = body.amountKg;
  if (
    typeof amountKg !== "number" ||
    !Number.isFinite(amountKg) ||
    amountKg <= 0 ||
    amountKg > 1000
  ) {
    return jsonResponse(
      { ok: false, message: "amountKg must be a number greater than 0 and no more than 1000." },
      400,
      { "cache-control": "no-store" },
    );
  }

  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) return firebase.response;

  const event = {
    timestamp: new Date().toISOString(),
    pondId,
    mode: "manual",
    amountKg,
    status: "completed",
    requestedBy: authz.user.email,
  };

  const response = await writeFirebaseJson(
    firebase.baseUrl,
    `${encodedFarmPondPath(farmId, pondId)}/feeding/events`,
    firebase.auth,
    event,
    "POST",
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return jsonResponse(
      {
        ok: false,
        message: "Failed to record manual feeding event.",
        status: response.status,
        detail: detail.slice(0, 200),
      },
      502,
      { "cache-control": "no-store" },
    );
  }

  const result = (await response.json().catch(() => ({}))) as { name?: string };
  return jsonResponse({ ok: true, id: String(result.name ?? ""), event }, 201, {
    "cache-control": "no-store",
  });
}
