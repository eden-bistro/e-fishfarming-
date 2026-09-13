import { type AuthorizedUser } from "@/lib/server-authz";
import {
  encodedFarmPondPath,
  getDefaultPondId,
  getEnvRecord,
  readFirebaseJson,
  resolveFirebaseDatabase,
} from "@/lib/iot-firebase";

type ChatMessage = { role: "user" | "assistant"; text: string };
type ContextSection = { status: "available" | "unavailable"; data?: unknown; reason?: string };
type FarmContext = Record<string, ContextSection>;

type WaterReading = {
  timestamp?: string;
  pondId?: string;
  deviceId?: string;
  temperature?: number;
  ph?: number;
  dissolvedOxygen?: number;
  turbidity?: number;
  ammonia?: number;
  nitrite?: number;
};

const MAX_ROWS = 50;

function requestToken(request: Request) {
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}

function wants(question: string, terms: string[]) {
  return terms.some((term) => question.includes(term));
}

function relevantQuestion(question: string, history: ChatMessage[]) {
  const normalized = question.toLowerCase();
  // Short follow-ups should retain the immediately preceding topic without fetching every dataset.
  if (normalized.split(/\s+/).length <= 5 && /\b(that|it|this|why|good|okay)\b/.test(normalized)) {
    return `${history
      .slice(-2)
      .map((message) => message.text)
      .join(" ")} ${normalized}`.toLowerCase();
  }
  return normalized;
}

async function supabaseSelect(request: Request, env: unknown, path: string): Promise<unknown[]> {
  const config = getEnvRecord(env);
  const url = (config.SUPABASE_URL ?? config.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const anonKey = config.SUPABASE_ANON_KEY ?? config.VITE_SUPABASE_ANON_KEY ?? "";
  const token = requestToken(request);
  if (!url || !anonKey || !token) throw new Error("Supabase data access is not configured.");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anonKey, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function safely(section: () => Promise<unknown>): Promise<ContextSection> {
  try {
    return { status: "available", data: await section() };
  } catch (error) {
    return {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "Data source failed.",
    };
  }
}

function numberOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeWaterReading(value: unknown, pondId: string): WaterReading | null {
  if (!value || typeof value !== "object") return null;
  const reading = value as Record<string, unknown>;
  return {
    timestamp: typeof reading.timestamp === "string" ? reading.timestamp : undefined,
    pondId: typeof reading.pondId === "string" ? reading.pondId : pondId,
    deviceId: typeof reading.deviceId === "string" ? reading.deviceId : undefined,
    temperature: numberOrUndefined(reading.temperature),
    ph: numberOrUndefined(reading.ph),
    dissolvedOxygen: numberOrUndefined(reading.dissolvedOxygen),
    turbidity: numberOrUndefined(reading.turbidity),
    ammonia: numberOrUndefined(reading.ammonia),
    nitrite: numberOrUndefined(reading.nitrite),
  };
}

async function firebaseWaterContext(user: AuthorizedUser, env: unknown, includeAlerts: boolean) {
  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) throw new Error("Firebase telemetry is unavailable.");
  const pondId = getDefaultPondId(env);
  const path = encodedFarmPondPath(user.farmId, pondId);
  const [latestResponse, devicesResponse, alertsResponse] = await Promise.all([
    readFirebaseJson(firebase.baseUrl, `${path}/water/latest`, firebase.auth),
    readFirebaseJson(firebase.baseUrl, `${path}/devices/status`, firebase.auth),
    includeAlerts
      ? readFirebaseJson(firebase.baseUrl, `${path}/alerts`, firebase.auth)
      : Promise.resolve(null),
  ]);
  if (!latestResponse.ok) throw new Error("No current water telemetry is available.");
  const latest = normalizeWaterReading(await latestResponse.json().catch(() => null), pondId);
  const devices = devicesResponse.ok ? await devicesResponse.json().catch(() => null) : null;
  const alerts = alertsResponse?.ok ? await alertsResponse.json().catch(() => null) : null;
  return { activePondId: pondId, latest, devices, ...(includeAlerts ? { alerts } : {}) };
}

export async function buildAiFarmContext(
  request: Request,
  env: unknown,
  user: AuthorizedUser,
  question: string,
  history: ChatMessage[],
): Promise<FarmContext> {
  const query = relevantQuestion(question, history);
  const water = wants(query, [
    "water",
    "temperature",
    "temp",
    "ph",
    "oxygen",
    "ammonia",
    "nitrite",
    "turbidity",
    "pond",
    "device",
    "alert",
    "fish growing",
    "farm doing",
  ]);
  const feeding = wants(query, ["feed", "feeding", "eating", "farm doing"]);
  const production = wants(query, [
    "production",
    "stock",
    "harvest",
    "mortality",
    "growing",
    "farm doing",
  ]);
  const inventory = wants(query, ["inventory", "stock", "feed", "farm doing"]);
  const finance = wants(query, ["finance", "income", "expense", "profit", "revenue", "farm doing"]);
  const overview = wants(query, ["farm doing", "farm overview", "farm status"]);
  const context: FarmContext = {};

  if (water) context.telemetry = await safely(() => firebaseWaterContext(user, env, true));
  if (feeding)
    context.feeding = await safely(() =>
      supabaseSelect(
        request,
        env,
        `feeding_events?select=timestamp,pond_id,mode,amount_kg,status&order=timestamp.desc&limit=${MAX_ROWS}`,
      ),
    );
  if (production)
    context.production = await safely(() =>
      supabaseSelect(
        request,
        env,
        `production_events?select=cage_id,type,fish_count,weight_kg,feed_kg,created_at&order=created_at.desc&limit=${MAX_ROWS}`,
      ),
    );
  if (inventory)
    context.inventory = await safely(() =>
      supabaseSelect(
        request,
        env,
        `inventory_items?select=name,category,unit,quantity,low_stock_threshold,created_at&order=created_at.desc&limit=${MAX_ROWS}`,
      ),
    );
  if (finance) {
    context.financial = await safely(async () => {
      const [income, expenses] = await Promise.all([
        supabaseSelect(
          request,
          env,
          `finance_income?select=date,income_type,quantity,unit,total&order=date.desc&limit=${MAX_ROWS}`,
        ),
        supabaseSelect(
          request,
          env,
          `finance_expenses?select=date,category,amount&order=date.desc&limit=${MAX_ROWS}`,
        ),
      ]);
      return { income, expenses };
    });
  }
  if (overview) {
    context.farm = await safely(async () => {
      const [profiles, cages] = await Promise.all([
        supabaseSelect(
          request,
          env,
          "farm_profiles?select=name,location,total_ponds,total_stock_kg,cage_names&limit=1",
        ),
        supabaseSelect(
          request,
          env,
          `cages?select=name,location,fish_population,biomass_kg,status&order=created_at.desc&limit=${MAX_ROWS}`,
        ),
      ]);
      return { profile: profiles[0] ?? null, cages };
    });
  }
  return context;
}
