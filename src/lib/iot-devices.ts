import {
  encodedFarmPondPath,
  getDefaultFarmId,
  getDefaultPondId,
  jsonResponse,
  noContentResponse,
  readFirebaseJson,
  resolveFirebaseDatabase,
} from "@/lib/iot-firebase";
import { getAuthorizedUser, requireFarmAccess } from "@/lib/server-authz";

export type IotDeviceStatus = {
  deviceId: string;
  firmware: string;
  online: boolean;
  rssi: number;
  freeHeap: number;
  updatedAt: string;
};

const DEVICE_OFFLINE_AFTER_MS = 5 * 60 * 1000;

function isFreshHeartbeat(updatedAt: string): boolean {
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= DEVICE_OFFLINE_AFTER_MS;
}

function normalizeDeviceStatus(
  status: Partial<IotDeviceStatus> & { deviceId: string },
): IotDeviceStatus {
  const updatedAt = String(status.updatedAt ?? "");
  return {
    deviceId: String(status.deviceId),
    firmware: String(status.firmware ?? "unknown"),
    online: Boolean(status.online) && isFreshHeartbeat(updatedAt),
    rssi: Number(status.rssi ?? 0) || 0,
    freeHeap: Number(status.freeHeap ?? 0) || 0,
    updatedAt,
  };
}

export async function handleIotDevices(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return noContentResponse(204, {
      allow: "GET, HEAD, OPTIONS",
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ ok: false, message: "Method not allowed for IoT devices." }, 405, {
      allow: "GET, HEAD, OPTIONS",
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

  const path = `${encodedFarmPondPath(farmId, pondId)}/devices/status`;
  const response = await readFirebaseJson(firebase.baseUrl, path, firebase.auth);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return jsonResponse(
      {
        ok: false,
        message: "Failed to read IoT device statuses.",
        status: response.status,
        detail: detail.slice(0, 200),
      },
      response.status === 404 ? 404 : 502,
      { "cache-control": "no-store" },
    );
  }

  const raw = (await response.json().catch(() => null)) as Record<
    string,
    Omit<IotDeviceStatus, "deviceId">
  > | null;
  const devices =
    raw && typeof raw === "object"
      ? Object.entries(raw).map(([deviceId, value]) =>
          normalizeDeviceStatus({ deviceId, ...value }),
        )
      : [];
  devices.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return jsonResponse({ ok: true, farmId, pondId, devices }, 200, { "cache-control": "no-store" });
}
