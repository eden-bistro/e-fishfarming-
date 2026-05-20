const env = import.meta.env as Record<string, string | undefined>;

export const defaultFarmId = env.VITE_DEFAULT_FARM_ID ?? "default";
export const defaultPondId = env.VITE_DEFAULT_POND_ID ?? "pond-a";

export function farmPath(...parts: string[]) {
  return ["farms", defaultFarmId, ...parts].join("/");
}

export function pondPath(...parts: string[]) {
  return farmPath("ponds", defaultPondId, ...parts);
}
