const env = import.meta.env as Record<string, string | undefined>;

export const supabaseUrl = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getMissingSupabaseConfigKeys(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL (or SUPABASE_URL)");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
  return missing;
}
