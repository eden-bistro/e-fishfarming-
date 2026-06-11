import { pondPath } from "@/firebase/paths";
import { getActiveFarmId, getActivePondId } from "@/lib/tenant";

const env = import.meta.env as Record<string, string | undefined>;
const firebaseBaseUrl = env.VITE_FIREBASE_DATABASE_URL ?? env.FIREBASE_DATABASE_URL;
const DEVICE_OFFLINE_AFTER_MS = 5 * 60 * 1000;

function isFreshHeartbeat(updatedAt: string): boolean {
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= DEVICE_OFFLINE_AFTER_MS;
}

function normalizeDeviceStatus(status: Partial<DeviceStatus> & { deviceId: string }): DeviceStatus {
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

function explicitPondPath(farmId: string, pondId: string, ...parts: string[]) {
  return ["farms", farmId, "ponds", pondId, ...parts].map(encodeURIComponent).join("/");
}

export type DeviceStatus = {
  deviceId: string;
  firmware: string;
  online: boolean;
  rssi: number;
  freeHeap: number;
  updatedAt: string;
};

export type FeedingCommand = {
  id: string;
  action: "dispense_feed";
  amountKg: number;
  targetPondId: string;
  requestedBy: string;
  requestedAt: string;
  status: "queued" | "ack" | "done" | "failed";
};

export async function listDeviceStatuses(
  farmId = getActiveFarmId(),
  pondId = getActivePondId(),
): Promise<DeviceStatus[]> {
  const params = new URLSearchParams({ farmId, pondId });
  let shouldTryDirectFirebaseFallback = false;

  try {
    const response = await fetch(`/api/iot/devices?${params.toString()}`, {
      headers: { accept: "application/json" },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("application/json")) {
      const payload = (await response.json()) as { devices?: DeviceStatus[] };
      return Array.isArray(payload.devices) ? payload.devices : [];
    }
    shouldTryDirectFirebaseFallback =
      response.status === 404 || !contentType.includes("application/json");
  } catch {
    shouldTryDirectFirebaseFallback = true;
  }

  if (!shouldTryDirectFirebaseFallback || !firebaseBaseUrl) return [];

  try {
    const response = await fetch(
      `${firebaseBaseUrl}/${explicitPondPath(farmId, pondId, "devices", "status")}.json`,
    );
    if (!response.ok) return [];
    const raw = (await response.json()) as Record<
      string,
      Partial<Omit<DeviceStatus, "deviceId">>
    > | null;
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw)
      .map(([deviceId, value]) => normalizeDeviceStatus({ deviceId, ...value }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  } catch {
    return [];
  }
}

export async function queueFeedingCommand(
  input: Omit<FeedingCommand, "id" | "requestedAt" | "status">,
) {
  if (!firebaseBaseUrl) throw new Error("Firebase is not configured.");
  const payload = {
    ...input,
    requestedAt: new Date().toISOString(),
    status: "queued",
  };

  const response = await fetch(`${firebaseBaseUrl}/${pondPath("feeding", "commands")}.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Failed to queue feeding command: ${response.status}`);

  const body = (await response.json()) as { name?: string };
  return String(body.name ?? "");
}

export async function listFeedingCommands(limit = 20): Promise<FeedingCommand[]> {
  if (!firebaseBaseUrl) return [];
  const response = await fetch(
    `${firebaseBaseUrl}/${pondPath("feeding", "commands")}.json?orderBy="$key"&limitToLast=${limit}`,
  );
  if (!response.ok) return [];

  const raw = (await response.json()) as Record<string, Omit<FeedingCommand, "id">> | null;
  if (!raw || typeof raw !== "object") return [];

  return Object.entries(raw)
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}
