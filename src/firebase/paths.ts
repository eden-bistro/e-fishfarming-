import { DEFAULT_FARM_ID, DEFAULT_POND_ID, getActiveFarmId, getActivePondId } from "@/lib/tenant";

export function farmPath(...parts: string[]) {
  return ["farms", getActiveFarmId() || DEFAULT_FARM_ID, ...parts].join("/");
}

export function pondPath(...parts: string[]) {
  return farmPath("ponds", getActivePondId() || DEFAULT_POND_ID, ...parts);
}
