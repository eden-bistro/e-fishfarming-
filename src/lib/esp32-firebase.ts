import { pondPath } from "@/firebase/paths";
import { getActiveFarmId, getActivePondId } from "@/lib/tenant";

const env = import.meta.env as Record<string, string | undefined>;
const firebaseBaseUrl = env.VITE_FIREBASE_DATABASE_URL ?? env.FIREBASE_DATABASE_URL;
export const DEVICE_OFFLINE_AFTER_MS = 5 * 60 * 1000;
export const DEVICE_STATUS_POLL_MS = 5 * 1000;
export const DEVICE_STATUS_TICK_MS = 1000;

export function deviceHeartbeatAgeMs(updatedAt: string, now = Date.now()): number | null {
  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(now - timestamp, 0);
}

export function isFreshHeartbeat(updatedAt: string, now = Date.now()): boolean {
  const ageMs = deviceHeartbeatAgeMs(updatedAt, now);
  return ageMs !== null && ageMs <= DEVICE_OFFLINE_AFTER_MS;
}

export function formatHeartbeatAge(updatedAt: string, now = Date.now()): string {
  const ageMs = deviceHeartbeatAgeMs(updatedAt, now);
  if (ageMs === null) return "unknown";

  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export function deviceOfflineCountdown(updatedAt: string, now = Date.now()): string | null {
  const ageMs = deviceHeartbeatAgeMs(updatedAt, now);
  if (ageMs === null || ageMs >= DEVICE_OFFLINE_AFTER_MS) return null;

  const remainingSeconds = Math.ceil((DEVICE_OFFLINE_AFTER_MS - ageMs) / 1000);
  if (remainingSeconds >= 60) {
    const minutes = Math.ceil(remainingSeconds / 60);
    return `${minutes} min`;
  }

  return `${remainingSeconds} sec`;
}

export function normalizeDeviceStatus(status: DeviceStatus, now = Date.now()): DeviceStatus {
  return {
    ...status,
    online: Boolean(status.online) && isFreshHeartbeat(status.updatedAt, now),
  };
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
      return Array.isArray(payload.devices)
        ? payload.devices.map((device) => normalizeDeviceStatus(device))
        : [];
    }
    shouldTryDirectFirebaseFallback =
      response.status === 404 || !contentType.includes("application/json");
  } catch {
    shouldTryDirectFirebaseFallback = true;
  }

  if (!shouldTryDirectFirebaseFallback || !firebaseBaseUrl) return [];
  const response = await fetch(`${firebaseBaseUrl}/${pondPath("devices", "status")}.json`);
  if (!response.ok) return [];
  const raw = (await response.json()) as Record<string, Omit<DeviceStatus, "deviceId">> | null;
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw)
    .map(([deviceId, value]) => normalizeDeviceStatus({ deviceId, ...value }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
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
