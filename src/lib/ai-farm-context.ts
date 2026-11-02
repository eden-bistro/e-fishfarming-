import { type AuthorizedUser } from "@/lib/server-authz";
import {
  encodedFarmPondPath,
  firstDefined,
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

const MAX_ROWS_PER_SECTION = 30;
const MAX_CONTEXT_CHARS = 18_000;

function relevantQuestion(question: string, history: ChatMessage[]) {
  const normalized = question.toLowerCase();
  if (
    normalized.split(/\\s+/).length <= 5 &&
    /\\b(that|it|this|why|good|okay|safe|normal)\\b/.test(normalized)
  ) {
    return `${history
      .slice(-2)
      .map((message) => message.text)
      .join(" ")} ${normalized}`.toLowerCase();
  }
  return normalized;
}

async function safely(section: () => Promise<unknown>): Promise<ContextSection> {
  try {
    return { status: "available", data: await section() };
  } catch {
    return { status: "unavailable", reason: "This platform data source could not be verified." };
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeWaterReading(value: unknown, pondId: string): WaterReading | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
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

async function firebaseWaterContext(user: AuthorizedUser, env: unknown) {
  const firebase = await resolveFirebaseDatabase(env);
  if (!firebase.ok) throw new Error("Firebase telemetry is unavailable.");

  const pondId = getDefaultPondId(env);
  const path = encodedFarmPondPath(user.farmId, pondId);
  const latestResponse = await readFirebaseJson(
    firebase.baseUrl,
    `${path}/water/latest`,
    firebase.auth,
  );
  if (!latestResponse.ok) throw new Error("No current water telemetry is available.");

  const latest = normalizeWaterReading(await latestResponse.json().catch(() => null), pondId);
  if (!latest) throw new Error("The latest IoT reading is empty or invalid.");
  return { source: "IoT sensor reading", activePondId: pondId, latest };
}

type ReadTable = {
  name: string;
  select: string;
  tenantColumn: "farm_id" | "tenant_id";
};

async function readUserTable(
  request: Request,
  env: unknown,
  user: AuthorizedUser,
  table: ReadTable,
): Promise<unknown[]> {
  const config = getEnvRecord(env);
  const baseUrl = firstDefined([config.SUPABASE_URL, config.VITE_SUPABASE_URL])?.replace(/\\/+$/, "");
  const anonKey = firstDefined([config.SUPABASE_ANON_KEY, config.VITE_SUPABASE_ANON_KEY]);
  const token = request.headers.get("authorization")?.replace(/^Bearer\\s+/i, "").trim();
  if (!baseUrl || !anonKey || !token) throw new Error("User-scoped Supabase access is not configured.");

  const tenantValue = table.tenantColumn === "farm_id" ? user.farmId : user.id;
  const url = new URL(`${baseUrl}/rest/v1/${table.name}`);
  url.searchParams.set("select", table.select);
  url.searchParams.set(table.tenantColumn, `eq.${tenantValue}`);
  url.searchParams.set("limit", String(MAX_ROWS_PER_SECTION));
  if (table.name === "finance_income" || table.name === "finance_expenses") {
    url.searchParams.set("order", "date.desc");
  } else {
    url.searchParams.set("order", "created_at.desc");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase read failed for ${table.name} (${response.status}).`);
  }
  const rows = await response.json().catch(() => null);
  if (!Array.isArray(rows)) throw new Error(`Invalid response from ${table.name}.`);
  return rows;
}

/**
 * Read-only, user-scoped platform context. Every Supabase request carries the
 * authenticated user's JWT and the public anon key so database RLS remains in force.
 * No service-role credentials, browser-supplied tenant IDs, writes, device setup,
 * device configuration, secrets, user-management data, or IoT commands are exposed.
 */
export async function buildAiFarmContext(
  request: Request,
  env: unknown,
  user: AuthorizedUser,
  _question: string,
  _history: ChatMessage[],
): Promise<FarmContext> {
  const tables: Array<ReadTable & { key: string }> = [
    { key: "farmProfile", name: "farm_profiles", tenantColumn: "tenant_id", select: "name,location,owner,currency,total_ponds,total_stock_kg,cage_names,updated_at" },
    { key: "income", name: "finance_income", tenantColumn: "farm_id", select: "date,buyer,income_type,unit,quantity,unit_price,total" },
    { key: "expenses", name: "finance_expenses", tenantColumn: "farm_id", select: "date,category,description,amount" },
    { key: "feeding", name: "feeding_events", tenantColumn: "farm_id", select: "timestamp,pond_id,mode,amount_kg,status" },
    { key: "production", name: "production_events", tenantColumn: "tenant_id", select: "cage_id,type,fish_count,weight_kg,feed_kg,created_at" },
    { key: "inventory", name: "inventory_items", tenantColumn: "tenant_id", select: "name,category,unit,quantity,low_stock_threshold,created_at" },
    { key: "inventoryMovements", name: "inventory_movements", tenantColumn: "tenant_id", select: "item_id,type,quantity,note,created_at" },
    { key: "cages", name: "cages", tenantColumn: "tenant_id", select: "name,location,fish_population,biomass_kg,status,created_at" },
    { key: "waterHistory", name: "water_readings", tenantColumn: "farm_id", select: "timestamp,pond_id,temperature,ph,dissolved_oxygen,turbidity,ammonia,nitrite" },
  ];

  const entries = await Promise.all(
    tables.map(async (table) => [
      table.key,
      await safely(() => readUserTable(request, env, user, table)),
    ] as const),
  );
  const context: FarmContext = Object.fromEntries(entries);

  // Firebase remains the source for the live sensor snapshot. The database history
  // above is separately marked unavailable if its own RLS/table read fails.
  context.liveTelemetry = await safely(() => firebaseWaterContext(user, env));

  // Bound prompt size without silently implying that a truncated section is complete.
  let serialized = JSON.stringify(context);
  if (serialized.length > MAX_CONTEXT_CHARS) {
    for (const section of Object.values(context)) {
      if (section.status === "available" && Array.isArray(section.data)) {
        section.data = section.data.slice(0, 10);
        section.reason = "Showing the 10 most recent available records to fit the AI context limit.";
      }
    }
    serialized = JSON.stringify(context);
    if (serialized.length > MAX_CONTEXT_CHARS) {
      return {
        platformData: {
          status: "partial",
          reason: "Platform context exceeded the safe prompt size. Ask about one module at a time.",
        },
      };
    }
  }
  return context;
}
