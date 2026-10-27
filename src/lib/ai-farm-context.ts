import { type AuthorizedUser } from "@/lib/server-authz";
import {
  encodedFarmPondPath,
  getDefaultPondId,
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

function relevantQuestion(question: string, history: ChatMessage[]) {
  const normalized = question.toLowerCase();
  if (
    normalized.split(/\s+/).length <= 5 &&
    /\b(that|it|this|why|good|okay|safe|normal)\b/.test(normalized)
  ) {
    return `${history
      .slice(-2)
      .map((message) => message.text)
      .join(" ")} ${normalized}`.toLowerCase();
  }
  return normalized;
}

function asksAboutTelemetry(question: string) {
  return /\b(water|temperature|temp|ph|oxygen|dissolved oxygen|ammonia|nitrite|turbidity|sensor|telemetry|iot reading|pond condition|water quality|alert|farm status|farm doing|fish stressed|fish gasping|water reading|current reading|latest reading|reading history)\b/i.test(
    question,
  );
}

async function safely(section: () => Promise<unknown>): Promise<ContextSection> {
  try {
    return { status: "available", data: await section() };
  } catch {
    return { status: "unavailable", reason: "Current IoT telemetry could not be verified." };
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

/**
 * The assistant is read-only and deliberately receives only sensor readings.
 * It does not load finance, inventory, production, feeding records, device setup,
 * credentials, configuration, or controls into its context.
 */
export async function buildAiFarmContext(
  _request: Request,
  env: unknown,
  user: AuthorizedUser,
  question: string,
  history: ChatMessage[],
): Promise<FarmContext> {
  const query = relevantQuestion(question, history);
  if (!asksAboutTelemetry(query)) return {};
  return { telemetry: await safely(() => firebaseWaterContext(user, env)) };
}
