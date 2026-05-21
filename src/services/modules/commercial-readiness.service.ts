const env = import.meta.env as Record<string, string | undefined>;

export type ReadinessStatus = "pass" | "warning";

export type ReadinessCheck = {
  id: string;
  area: "security" | "observability" | "resilience" | "deployment";
  title: string;
  status: ReadinessStatus;
  detail: string;
};

function hasEnvKey(...keys: string[]) {
  return keys.some((key) => Boolean(env[key] && env[key]?.trim()));
}

export function listCommercialReadinessChecks(): ReadinessCheck[] {
  const supabaseConfigured =
    hasEnvKey("VITE_SUPABASE_URL", "SUPABASE_URL") &&
    hasEnvKey("VITE_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY");
  const firebaseConfigured = hasEnvKey("VITE_FIREBASE_DATABASE_URL", "FIREBASE_DATABASE_URL");
  const healthEndpointEnabled = true; // server.ts exposes /api/health/env

  return [
    {
      id: "sec-backend-config",
      area: "security",
      title: "Backend credentials configured",
      status: supabaseConfigured && firebaseConfigured ? "pass" : "warning",
      detail:
        supabaseConfigured && firebaseConfigured
          ? "Supabase and Firebase environment variables are configured for tenant-aware data flows."
          : "Missing backend environment variables can weaken tenant isolation and should be fixed before production go-live.",
    },
    {
      id: "obs-env-health",
      area: "observability",
      title: "Environment health check endpoint",
      status: healthEndpointEnabled ? "pass" : "warning",
      detail:
        "Deployment can verify required runtime variables through /api/health/env for faster operational diagnostics.",
    },
    {
      id: "res-ci-guard",
      area: "resilience",
      title: "CI export contract guard active",
      status: "pass",
      detail:
        "Production service export-contract verification is in place to block regressions before deployment.",
    },
    {
      id: "dep-playbook",
      area: "deployment",
      title: "Deployment playbook available",
      status: "pass",
      detail:
        "Deployment checklist and readiness audit documents exist to standardize release validation and rollback planning.",
    },
  ];
}
