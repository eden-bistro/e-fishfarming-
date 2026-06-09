import {
  encodedFarmPondPath,
  getDefaultFarmId,
  getDefaultPondId,
  jsonResponse,
  noContentResponse,
  readFirebaseJson,
  resolveFirebaseDatabase,
} from "@/lib/iot-firebase";

export async function handleIotLatest(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "GET, HEAD, OPTIONS",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ ok: false, message: "Method not allowed for IoT latest." }, 405, {
      allow: "GET, HEAD, OPTIONS",
    });
  }

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

  const path = `${encodedFarmPondPath(farmId, pondId)}/water/latest`;
  const response = await readFirebaseJson(firebase.baseUrl, path, firebase.auth);

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return jsonResponse(
      {
        ok: false,
        message: "Failed to read latest water telemetry.",
        status: response.status,
        detail: detail.slice(0, 200),
      },
      response.status === 404 ? 404 : 502,
      { "cache-control": "no-store" },
    );
  }

  const payload = await response.json().catch(() => null);
  return jsonResponse(payload, 200, { "cache-control": "no-store" });
}
