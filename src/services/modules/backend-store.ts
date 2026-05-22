import { getSessionUser } from "@/lib/auth";
import { getAccessToken } from "@/services/auth.service";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

export function backendEnabled() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function tenantId() {
  return getSessionUser()?.tenantId ?? "demo";
}

export async function restSelect(table: string) {
  if (!backendEnabled()) return null;
  const tid = tenantId();
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?tenant_id=eq.${encodeURIComponent(tid)}&select=*`,
    {
      headers: {
        apikey: supabaseAnonKey!,
        authorization: `Bearer ${accessToken ?? supabaseAnonKey!}`,
      },
    },
  );
  if (!response.ok) return null;
  return response.json();
}

export async function restInsert(table: string, row: Record<string, unknown>) {
  if (!backendEnabled()) return false;
  const accessToken = await getAccessToken();
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Prefer: "return=minimal",
      apikey: supabaseAnonKey!,
      authorization: `Bearer ${accessToken ?? supabaseAnonKey!}`,
    },
    body: JSON.stringify([{ ...row, tenant_id: tenantId() }]),
  });
  return response.ok;
}
