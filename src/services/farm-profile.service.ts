import { getSessionUser, getAccessToken } from "@/services/auth.service";
import type { FarmProfile } from "@/lib/auth";
import { hasSupabaseConfig, supabaseAnonKey, supabaseUrl } from "@/supabase/client";

const TABLE = "farm_profiles";

function authHeaders(accessToken: string | null): Headers {
  const headers = new Headers();
  if (!supabaseAnonKey) return headers;
  const authToken = accessToken?.trim() || supabaseAnonKey;
  headers.set("apikey", supabaseAnonKey);
  headers.set("authorization", `Bearer ${authToken}`);
  return headers;
}

function fromRow(row: Record<string, unknown>): FarmProfile {
  const cageNames = Array.isArray(row.cage_names) ? row.cage_names.map(String) : undefined;
  return {
    name: String(row.name ?? ""),
    location: String(row.location ?? ""),
    owner: String(row.owner ?? ""),
    currency: String(row.currency ?? ""),
    totalPonds: row.total_ponds == null ? null : Number(row.total_ponds),
    totalStockKg: row.total_stock_kg == null ? null : Number(row.total_stock_kg),
    cageNames,
  };
}

function toRow(farm: FarmProfile, tenantId: string) {
  return {
    tenant_id: tenantId,
    name: farm.name,
    location: farm.location,
    owner: farm.owner,
    currency: farm.currency,
    total_ponds: farm.totalPonds,
    total_stock_kg: farm.totalStockKg,
    cage_names: farm.cageNames ?? [],
    updated_at: new Date().toISOString(),
  };
}

export function farmProfileBackendAvailable() {
  return hasSupabaseConfig();
}

export async function fetchFarmProfileRemote(): Promise<FarmProfile | null> {
  const session = getSessionUser();
  if (!session || !hasSupabaseConfig()) return null;

  const accessToken = await getAccessToken();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE}?tenant_id=eq.${encodeURIComponent(session.id)}&select=*&limit=1`,
    { headers: authHeaders(accessToken) },
  );

  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return fromRow(rows[0] as Record<string, unknown>);
}

export async function saveFarmProfileRemote(farm: FarmProfile): Promise<boolean> {
  const session = getSessionUser();
  if (!session || !hasSupabaseConfig()) return false;

  const accessToken = await getAccessToken();
  const headers = authHeaders(accessToken);
  headers.set("content-type", "application/json");
  headers.set("Prefer", "resolution=merge-duplicates,return=minimal");

  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE}?on_conflict=tenant_id`, {
    method: "POST",
    headers,
    body: JSON.stringify([toRow(farm, session.id)]),
  });

  return response.ok;
}
