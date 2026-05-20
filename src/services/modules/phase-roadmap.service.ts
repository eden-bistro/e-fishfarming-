const env = import.meta.env as Record<string, string | undefined>;

export type RoadmapStatus = "completed" | "in_progress" | "pending";

export type RoadmapPhase = {
  id: string;
  title: string;
  status: RoadmapStatus;
  summary: string;
};

export function listRoadmapPhases(): RoadmapPhase[] {
  const hasSupabase = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  const hasFirebase = Boolean(env.VITE_FIREBASE_DATABASE_URL);

  return [
    {
      id: "2.7",
      title: "Hatchery → Production transfer workflow",
      status: "completed",
      summary: "Fingerling batches can move to cages and create stocking production events.",
    },
    {
      id: "2.8",
      title: "Unified alerts center (IoT + enterprise)",
      status: "completed",
      summary: "Alerts page merges water quality telemetry alerts with inventory/production operational alerts.",
    },
    {
      id: "2.9",
      title: "Data integration hardening (Supabase + Firebase)",
      status: hasSupabase && hasFirebase ? "in_progress" : "pending",
      summary: "Move enterprise modules from local demo storage to backend persistence with strict tenant boundaries.",
    },
    {
      id: "3.0",
      title: "Financial ERP depth and auditable ledgers",
      status: "pending",
      summary: "Full accounting-grade postings, payments, cost links, and exportable financial statements.",
    },
    {
      id: "3.1",
      title: "Production intelligence and forecasting",
      status: "pending",
      summary: "Advanced growth/FCR analytics, harvest forecasting, and trend-based operational guidance.",
    },
    {
      id: "3.2",
      title: "Automation + notification channels",
      status: "pending",
      summary: "Rule engine for feeding/device actions and multi-channel notifications (push/email/SMS).",
    },
    {
      id: "3.3",
      title: "Commercial readiness",
      status: "pending",
      summary: "Security hardening, observability, resilience testing, and deployment playbooks.",
    },
  ];
}

export function countRemainingPhases() {
  return listRoadmapPhases().filter((phase) => phase.status !== "completed").length;
}
