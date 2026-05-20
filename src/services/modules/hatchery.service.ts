import { getSessionUser } from "@/lib/auth";
import { addProductionEvent } from "@/services/modules/production.service";

export type FingerlingBatchStatus = "growing" | "ready_for_transfer" | "transferred" | "sold";

export type FingerlingBatch = {
  id: string;
  code: string;
  species: string;
  quantity: number;
  producedAt: string;
  status: FingerlingBatchStatus;
  transferredToCage?: string;
};

const KEY = "aquasmart_hatchery_batches";

function storageKey() {
  const user = getSessionUser();
  return `${KEY}:${user?.tenantId ?? "demo"}`;
}

export function listFingerlingBatches() {
  if (typeof window === "undefined") return [] as FingerlingBatch[];
  const raw = window.localStorage.getItem(storageKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FingerlingBatch[];
  } catch {
    return [];
  }
}

function writeBatches(rows: FingerlingBatch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(), JSON.stringify(rows));
}

export function createFingerlingBatch(input: Omit<FingerlingBatch, "id" | "status" | "transferredToCage">) {
  const batch: FingerlingBatch = { ...input, id: crypto.randomUUID(), status: "growing" };
  writeBatches([batch, ...listFingerlingBatches()]);
  return batch;
}

export function markBatchReadyForTransfer(batchId: string) {
  const updated = listFingerlingBatches().map((b) => (b.id === batchId ? { ...b, status: "ready_for_transfer" as const } : b));
  writeBatches(updated);
}

export function transferFingerlingsToCage(batchId: string, cageId: string) {
  const batches = listFingerlingBatches();
  const target = batches.find((b) => b.id === batchId);
  if (!target || target.status !== "ready_for_transfer") return null;

  const updated = batches.map((b) =>
    b.id === batchId ? { ...b, status: "transferred" as const, transferredToCage: cageId } : b,
  );
  writeBatches(updated);

  addProductionEvent({
    cageId,
    type: "stocking",
    fishCount: target.quantity,
    weightKg: undefined,
  });

  return { ...target, status: "transferred" as const, transferredToCage: cageId };
}
