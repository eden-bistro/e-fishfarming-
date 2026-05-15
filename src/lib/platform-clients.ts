const firebaseBaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const currentFarmId = (import.meta.env.VITE_FARM_ID as string | undefined) ?? "default";

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
  farm_id?: string;
  date: string;
  buyer: string;
  quantity_kg: number;
  price_per_kg: number;
  total: number;
};

export type ExpenseRow = {
  id?: number;
  farm_id?: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};

export type FarmPath = {
  farmId: string;
  pondId: string;
};

const defaultPath: FarmPath = { farmId: currentFarmId, pondId: "pond-a" };

async function supabaseRequest(path: string, init: RequestInit) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${supabaseAnonKey}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${message}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function getLatestWaterReading(path: Partial<FarmPath> = {}): Promise<WaterReading | null> {
  if (!firebaseBaseUrl) {
    throw new Error("Firebase database URL is missing");
  }

  const resolved = { ...defaultPath, ...path };
  const response = await fetch(`${firebaseBaseUrl}/farms/${resolved.farmId}/ponds/${resolved.pondId}/water/latest.json`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Firebase water read failed (${response.status}): ${message}`);
  }

  return (await response.json()) as WaterReading | null;
}

export async function pushManualFeedingEvent(amountKg: number, path: Partial<FarmPath> = {}): Promise<void> {
  if (!firebaseBaseUrl) {
    throw new Error("Firebase database URL is missing");
  }

  const resolved = { ...defaultPath, ...path };
  const payload = {
    timestamp: new Date().toISOString(),
    pondId: resolved.pondId,
    mode: "manual",
    amountKg,
    status: "completed",
  };

  const firebaseResponse = await fetch(
    `${firebaseBaseUrl}/farms/${resolved.farmId}/ponds/${resolved.pondId}/feeding/events.json`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!firebaseResponse.ok) {
    const message = await firebaseResponse.text();
    throw new Error(`Firebase feeding write failed (${firebaseResponse.status}): ${message}`);
  }

  await supabaseRequest("feeding_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      {
        timestamp: payload.timestamp,
        farm_id: resolved.farmId,
        pond_id: payload.pondId,
        mode: payload.mode,
        amount_kg: payload.amountKg,
        status: payload.status,
      },
    ]),
  });
}

export async function listIncome(): Promise<IncomeRow[]> {
  const rows = await supabaseRequest(`finance_income?select=*&farm_id=eq.${currentFarmId}&order=date.desc`, { method: "GET" });
  return (rows as IncomeRow[] | null) ?? [];
}
export async function addIncome(row: IncomeRow): Promise<void> {
  await supabaseRequest("finance_income", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ ...row, farm_id: currentFarmId }]),
  });
}
export async function updateIncome(id: number, row: IncomeRow): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}&farm_id=eq.${currentFarmId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}
export async function deleteIncome(id: number): Promise<void> {
  await supabaseRequest(`finance_income?id=eq.${id}&farm_id=eq.${currentFarmId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function listExpenses(): Promise<ExpenseRow[]> {
  const rows = await supabaseRequest(`finance_expenses?select=*&farm_id=eq.${currentFarmId}&order=date.desc`, { method: "GET" });
  return (rows as ExpenseRow[] | null) ?? [];
}
export async function addExpense(row: ExpenseRow): Promise<void> {
  await supabaseRequest("finance_expenses", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ ...row, farm_id: currentFarmId }]),
  });
}
export async function updateExpense(id: number, row: ExpenseRow): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}&farm_id=eq.${currentFarmId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}
export async function deleteExpense(id: number): Promise<void> {
  await supabaseRequest(`finance_expenses?id=eq.${id}&farm_id=eq.${currentFarmId}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
