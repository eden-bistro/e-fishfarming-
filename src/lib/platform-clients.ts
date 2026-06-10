import { pondPath } from "@/firebase/paths";
import { getActiveFarmId, getActivePondId } from "@/lib/tenant";
import { getAccessToken } from "@/services/auth.service";
const env = import.meta.env as Record<string, string | undefined>;

const firebaseBaseUrl = (env.VITE_FIREBASE_DATABASE_URL ?? env.FIREBASE_DATABASE_URL)?.trim();
const supabaseUrl = (env.VITE_SUPABASE_URL ?? env.SUPABASE_URL)?.trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY)?.trim();

export type WaterReading = {
  timestamp: string;
  pondId: string;
  temperature: number;
  ph: number;
  dissolvedOxygen: number;
  turbidity: number;
  ammonia: number;
  nitrite: number;
};

export type IncomeRow = {
  id?: number;
  date: string;
  buyer: string;
  quantity_kg: number;
  price_per_kg: number;
  total: number;
};

export type ExpenseRow = {
  id?: number;
  date: string;
  category: string;
  description: string;
  amount: number;
};

export type FeedingEventRow = {
  id?: number;
  timestamp: string;
  pond_id: string;
  mode: string;
  amount_kg: number;
  status: string;
};

export type WaterAlert = {
  id: string;
  type: "low_do" | "high_ammonia" | "high_temperature" | "ph_out_of_range" | "device_offline";
  severity: "critical" | "warning" | "info";
  message: string;
  pond_id: string;
  created_at: string;
  source: "firebase" | "derived";
};

export async function listFeedingEvents(): Promise<FeedingEventRow[]> {
  try {
    const rows = await supabaseRequest("feeding_events?select=*&order=timestamp.desc&limit=50", {
      method: "GET",
    });
    return (rows as FeedingEventRow[] | null) ?? [];
  } catch {
    return [];
  }
}

function mergeHeaders(base: Record<string, string>, extra?: HeadersInit): Headers {
  const headers = new Headers();
  Object.entries(base).forEach(([key, value]) => {
    if (value) headers.set(key, value);
  });

  if (extra) {
    new Headers(extra).forEach((value, key) => {
      if (value) headers.set(key, value);
    });
  }

  return headers;
}

async function supabaseRequest(path: string, init: RequestInit) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const accessToken = (await getAccessToken())?.trim();
  const authToken = accessToken || supabaseAnonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: mergeHeaders(
      {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        authorization: `Bearer ${authToken}`,
      },
      init.headers,
    ),
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

function explicitPondPath(farmId: string, pondId: string, ...parts: string[]) {
  return ["farms", farmId, "ponds", pondId, ...parts].map(encodeURIComponent).join("/");
}

function latestWaterTenantPairs() {
  const active = { farmId: getActiveFarmId(), pondId: getActivePondId() };
  const fallback = { farmId: DEFAULT_FARM_ID, pondId: DEFAULT_POND_ID };
  const seen = new Set<string>();
  return [active, fallback].filter(({ farmId, pondId }) => {
    const key = `${farmId}/${pondId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getLatestWaterReading(): Promise<WaterReading | null> {
  if (!firebaseBaseUrl) return null;
  try {
    const response = await fetch(`${firebaseBaseUrl}/${pondPath("water", "latest")}.json`);
    if (!response.ok) return null;
    return (await response.json()) as WaterReading | null;
  } catch {
    return null;
  }
}

export async function listWaterAlerts(limit = 20): Promise<WaterAlert[]> {
  if (!firebaseBaseUrl) return [];

  try {
    const response = await fetch(
      `${firebaseBaseUrl}/${pondPath("alerts")}.json?orderBy="$key"&limitToLast=${limit}`,
    );

    if (response.ok) {
      const raw = (await response.json()) as Record<
        string,
        Omit<WaterAlert, "id" | "source">
      > | null;
      if (raw && typeof raw === "object") {
        return Object.entries(raw)
          .map(([id, value]) => ({ id, ...value, source: "firebase" as const }))
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      }
    }
  } catch {
    // Fall back to derived alerts below.
  }

  const latest = await getLatestWaterReading();
  if (!latest) return [];

  const derived: WaterAlert[] = [];
  if (latest.dissolvedOxygen < 5) {
    derived.push({
      id: `derived-do-${latest.timestamp}`,
      type: "low_do",
      severity: latest.dissolvedOxygen < 4 ? "critical" : "warning",
      message: `Low dissolved oxygen detected (${latest.dissolvedOxygen} mg/L).`,
      pond_id: latest.pondId,
      created_at: latest.timestamp,
      source: "derived",
    });
  }
  if (latest.ammonia > 0.05) {
    derived.push({
      id: `derived-amm-${latest.timestamp}`,
      type: "high_ammonia",
      severity: latest.ammonia > 0.1 ? "critical" : "warning",
      message: `Ammonia above threshold (${latest.ammonia} mg/L).`,
      pond_id: latest.pondId,
      created_at: latest.timestamp,
      source: "derived",
    });
  }
  if (latest.temperature > 31) {
    derived.push({
      id: `derived-temp-${latest.timestamp}`,
      type: "high_temperature",
      severity: latest.temperature > 33 ? "critical" : "warning",
      message: `Water temperature is high (${latest.temperature} °C).`,
      pond_id: latest.pondId,
      created_at: latest.timestamp,
      source: "derived",
    });
  }
  if (latest.ph < 6.5 || latest.ph > 8.5) {
    derived.push({
      id: `derived-ph-${latest.timestamp}`,
      type: "ph_out_of_range",
      severity: "warning",
      message: `pH out of safe range (${latest.ph}).`,
      pond_id: latest.pondId,
      created_at: latest.timestamp,
      source: "derived",
    });
  }

  return derived;
}

export async function pushManualFeedingEvent(amountKg: number): Promise<void> {
  const farmId = getActiveFarmId();
  const pondId = getActivePondId();
  const payload = {
    timestamp: new Date().toISOString(),
    pondId,
    mode: "manual",
    amountKg,
    status: "completed",
  };

  if (firebaseBaseUrl) {
    await fetch(
      `${firebaseBaseUrl}/${explicitPondPath(farmId, pondId, "feeding", "events")}.json`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }

  await supabaseRequest("feeding_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      {
        timestamp: payload.timestamp,
        pond_id: payload.pondId,
        mode: payload.mode,
        amount_kg: payload.amountKg,
        status: payload.status,
        farm_id: farmId,
      },
    ]),
  });
}

export async function listIncome(): Promise<IncomeRow[]> {
  try {
    const rows = await supabaseRequest("finance_income?select=*&order=date.desc", {
      method: "GET",
    });
    return (rows as IncomeRow[] | null) ?? [];
  } catch {
    return [];
  }
}
export async function addIncome(row: IncomeRow): Promise<void> {
  await supabaseRequest("finance_income", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([row]),
  });
}
export async function updateIncome(id: number, row: IncomeRow): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}
export async function deleteIncome(id: number): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function listExpenses(): Promise<ExpenseRow[]> {
  try {
    const rows = await supabaseRequest("finance_expenses?select=*&order=date.desc", {
      method: "GET",
    });
    return (rows as ExpenseRow[] | null) ?? [];
  } catch {
    return [];
  }
}
export async function addExpense(row: ExpenseRow): Promise<void> {
  await supabaseRequest("finance_expenses", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([row]),
  });
}
export async function updateExpense(id: number, row: ExpenseRow): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}
export async function deleteExpense(id: number): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
