import { getActiveFarmId, getActivePondId } from "@/lib/tenant";
import { getAccessToken } from "@/services/auth.service";

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


async function authHeader(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
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
  scheduledFor?: string;
  status: "queued" | "ack" | "done" | "failed";
};

export async function listDeviceStatuses(
  farmId = getActiveFarmId(),
  pondId = getActivePondId(),
): Promise<DeviceStatus[]> {
  const token = await getAccessToken();
  if (!token || !farmId || !pondId) return [];

  const params = new URLSearchParams({ farmId, pondId });
  try {
    const response = await fetch(`/api/iot/devices?${params.toString()}`, {
      headers: { accept: "application/json", authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return [];
    const payload = (await response.json()) as { devices?: DeviceStatus[] };
    return Array.isArray(payload.devices)
      ? payload.devices.map((device) => normalizeDeviceStatus(device))
      : [];
  } catch {
    return [];
  }
}

export async function queueFeedingCommand(
  input: Omit<FeedingCommand, "id" | "requestedAt" | "status">,
) {
  const farmId = getActiveFarmId();
  const pondId = getActivePondId();
  const params = new URLSearchParams({ farmId, pondId });
  const response = await fetch(`/api/iot/feeding-command?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(input),
  });

  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    id?: string;
    message?: string;
    detail?: string;
  } | null;

  if (!response.ok || !result?.ok) {
    const detail = result?.detail ? ` ${result.detail}` : "";
    throw new Error(
      result?.message
        ? `${result.message}${detail}`
        : `Failed to queue feeding command: ${response.status}`,
    );
  }

  return String(result.id ?? "");
}

export async function listFeedingCommands(limit = 20): Promise<FeedingCommand[]> {
  const farmId = getActiveFarmId();
  const pondId = getActivePondId();
  const token = await getAccessToken();
  if (!farmId || !pondId || !token) return [];

  const params = new URLSearchParams({
    farmId,
    pondId,
    limit: String(Math.max(1, Math.min(limit, 100))),
  });

  try {
    const response = await fetch(`/api/iot/feeding-command?${params.toString()}`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/json")) {
      return [];
    }
    const payload = (await response.json()) as { commands?: FeedingCommand[] };
    return Array.isArray(payload.commands) ? payload.commands : [];
  } catch {
    return [];
  }
}
