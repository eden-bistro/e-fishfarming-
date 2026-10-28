import {
  encodedFarmPondPath,
  getDefaultPondId,
  firebaseDatabaseHeaders,
  firebaseDatabaseUrl,
  jsonResponse,
  noContentResponse,
  resolveFirebaseDatabase,
} from "@/lib/iot-firebase";
import { getAuthorizedUser, requireFarmAccess } from "@/lib/server-authz";

export async function handleIotAlerts(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "GET, HEAD, OPTIONS",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ ok: false, message: "Method not allowed for IoT alerts." }, 405, {
      allow: "GET, HEAD, OPTIONS",
    });
  }

  const authz = await getAuthorizedUser(request, env);
  if (!authz.ok) return authz.response;

  const url = new URL(request.url);
  const farmId = (url.searchParams.get("farmId") ?? "").trim();
  const pondId = (url.searchParams.get("pondId") || getDefaultPondId(env)).trim();
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") ?? 20) || 20, 100));

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(farmId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(pondId)) {
    return jsonResponse({ ok: false, message: "Valid farmId and pondId are required." }, 400, {
      "cache-control": "no-store",
    });
  }

  const forbidden = requireFarmAccess(authz.user, farmId);
  if (forbidden) return forbidden;

  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) return firebase.response;

  const path = `${encodedFarmPondPath(farmId, pondId)}/alerts`;
  const readUrl = new URL(firebaseDatabaseUrl(firebase.baseUrl, path, firebase.auth));
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
        message: "Failed to read water alerts.",
        status: response.status,
        detail: detail.slice(0, 200),
      },
      response.status === 404 ? 404 : 502,
      { "cache-control": "no-store" },
    );
  }

  const raw = (await response.json().catch(() => null)) as Record<
    string,
    Record<string, unknown>
  > | null;
  const alerts =
    raw && typeof raw === "object"
      ? Object.entries(raw)
          .sort(([, a], [, b]) => {
            const aCreatedAt = String(a["created_at"] ?? "");
            const bCreatedAt = String(b["created_at"] ?? "");
            return bCreatedAt.localeCompare(aCreatedAt);
          })
          .map(([id, value]) => ({ id, ...value }))
      : [];

  return jsonResponse({ ok: true, farmId, pondId, alerts }, 200, {
    "cache-control": "no-store",
  });
}
