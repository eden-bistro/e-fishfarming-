const firebaseBaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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

async function supabaseRequest(path: string, init: RequestInit) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

export async function getLatestWaterReading(): Promise<WaterReading | null> {
  if (!firebaseBaseUrl) return null;
  const response = await fetch(`${firebaseBaseUrl}/farms/default/ponds/pond-a/water/latest.json`);
  if (!response.ok) return null;
  return (await response.json()) as WaterReading | null;
}

export async function pushManualFeedingEvent(amountKg: number): Promise<void> {
  if (!firebaseBaseUrl) return;
  const payload = {
    timestamp: new Date().toISOString(),
    pondId: "pond-a",
    mode: "manual",
    amountKg,
    status: "completed",
  };

  await fetch(`${firebaseBaseUrl}/farms/default/ponds/pond-a/feeding/events.json`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

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
      },
    ]),
  });
}

export async function listIncome(): Promise<IncomeRow[]> {
  const rows = await supabaseRequest("finance_income?select=*&order=date.desc", { method: "GET" });
  return (rows as IncomeRow[] | null) ?? [];
}
export async function addIncome(row: IncomeRow): Promise<void> {
  await supabaseRequest("finance_income", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([row]) });
}
export async function updateIncome(id: number, row: IncomeRow): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
}
export async function deleteIncome(id: number): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

export async function listExpenses(): Promise<ExpenseRow[]> {
  const rows = await supabaseRequest("finance_expenses?select=*&order=date.desc", { method: "GET" });
  return (rows as ExpenseRow[] | null) ?? [];
}
export async function addExpense(row: ExpenseRow): Promise<void> {
  await supabaseRequest("finance_expenses", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([row]) });
}
export async function updateExpense(id: number, row: ExpenseRow): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
}
export async function deleteExpense(id: number): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
