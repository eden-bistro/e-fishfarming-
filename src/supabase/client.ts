const env = import.meta.env as Record<string, string | undefined>;

// Supabase anon keys are public client credentials; row-level security protects database access.

export const supabaseUrl = (
  env.VITE_SUPABASE_URL ??
  env.SUPABASE_URL ??
  "https://oalxkihmpqovopifxlbq.supabase.co"
).trim();
export const supabaseAnonKey = (
  env.VITE_SUPABASE_ANON_KEY ??
  env.SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbHhraWhtcHFvdm9waWZ4bGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNzgwODYsImV4cCI6MjA5Mzg1NDA4Nn0.2fVawDrCjx9oNPYV9rFWXltIQIiCqPE9qB3DsabpAQk"
).trim();

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getMissingSupabaseConfigKeys(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL (or SUPABASE_URL)");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)");
  return missing;
}
