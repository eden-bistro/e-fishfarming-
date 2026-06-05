import { getSessionUser } from "@/lib/auth";
import { getAccessToken } from "@/services/auth.service";

const env = import.meta.env as Record<string, string | undefined>;
const supabaseUrl = (env.VITE_SUPABASE_URL ?? env.SUPABASE_URL)?.trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY)?.trim();

export function backendEnabled() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function tenantId() {
  const session = getSessionUser();
  return session?.id ?? "anonymous";
}

function authHeaders(accessToken: string | null): Headers {
  const headers = new Headers();
  if (!supabaseAnonKey) return headers;
  const authToken = accessToken?.trim() || supabaseAnonKey;
  headers.set("apikey", supabaseAnonKey);
  headers.set("authorization", `Bearer ${authToken}`);
  return headers;
}

export async function restSelect(table: string) {
  if (!backendEnabled()) return null;
  const tid = tenantId();
  const accessToken = await getAccessToken();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?tenant_id=eq.${encodeURIComponent(tid)}&select=*`,
    {
      headers: authHeaders(accessToken),
    },
  );
  if (!response.ok) return null;
  return response.json();
}

export async function restInsert(table: string, row: Record<string, unknown>) {
  if (!backendEnabled()) return false;
  const tid = tenantId();
  const accessToken = await getAccessToken();
  const headers = authHeaders(accessToken);
  headers.set("content-type", "application/json");
  headers.set("Prefer", "return=minimal");
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify([{ ...row, tenant_id: tid }]),
  });
  return response.ok;
}
