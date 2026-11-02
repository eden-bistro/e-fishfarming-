import { getAuthorizedUser } from "@/lib/server-authz";
import { getEnvRecord, jsonResponse } from "@/lib/iot-firebase";
import { buildAiFarmContext } from "@/lib/ai-farm-context";

type ChatMessage = { role: "user" | "assistant"; text: string };
type AiProvider = "groq";
type AiResponse = { answer: string };
type ProviderFailure = "configuration" | "rate_limit" | "unavailable" | "invalid_response";

const MAX_QUESTION_LENGTH = 2_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4_000;

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (message): message is Record<string, unknown> =>
        Boolean(message) && typeof message === "object" && !Array.isArray(message),
    )
    .map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: String(message.text ?? "").trim(),
    }))
    .filter((message) => message.text.length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({ ...message, text: message.text.slice(0, MAX_MESSAGE_LENGTH) }));
}

function groqOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (part): part is { text: string } =>
        Boolean(part) &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string",
    )
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function getAiProvider(env: unknown): AiProvider | null {
  const configured = (getEnvRecord(env).AI_PROVIDER ?? "groq").trim().toLowerCase();
  return configured === "groq" ? "groq" : null;
}

function providerFailureMessage(failure: ProviderFailure): string {
  switch (failure) {
    case "configuration":
      return "AquaSmart AI is not configured. Ask your administrator to configure the server-side AI provider.";
    case "rate_limit":
      return "AquaSmart AI is temporarily busy. Please try again in a moment.";
    case "unavailable":
      return "AquaSmart AI could not reach the model right now. Please try again.";
    case "invalid_response":
      return "AquaSmart AI returned an incomplete answer. Please try again.";
  }
}

/**
 * Provider boundary: callers pass controlled server-side context, never browser-supplied farm IDs.
 * Groq offers an OpenAI-compatible HTTPS chat-completions API and is called with native fetch so
 * this remains compatible with the Cloudflare Worker runtime without a provider SDK.
 */
async function generateAiResponse({
  env,
  systemInstructions,
  history,
  question,
}: {
  env: unknown;
  systemInstructions: string;
  history: ChatMessage[];
  question: string;
}): Promise<{ ok: true; value: AiResponse } | { ok: false; failure: ProviderFailure }> {
  const config = getEnvRecord(env);
  const provider = getAiProvider(env);
  const apiKey = config.AI_API_KEY?.trim();
  if (!provider || !apiKey) return { ok: false, failure: "configuration" };

  const model = config.AI_MODEL?.trim() || "openai/gpt-oss-120b";
  const messages = [
    { role: "system", content: systemInstructions },
    ...history.map((message) => ({ role: message.role, content: message.text })),
    { role: "user" as const, content: question },
  ];

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages, max_completion_tokens: 700, temperature: 0.3 }),
    });
  } catch {
    return { ok: false, failure: "unavailable" };
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("[ai-chat] Groq model request failed", response.status);
    return {
      ok: false,
      failure:
        response.status === 401 || response.status === 403
          ? "configuration"
          : response.status === 429
            ? "rate_limit"
            : "unavailable",
    };
  }

  const answer = groqOutputText(payload);
  return answer ? { ok: true, value: { answer } } : { ok: false, failure: "invalid_response" };
}

export async function handleAiChat(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  }
  if (request.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405, { allow: "POST, OPTIONS" });
  }

  const authorization = await getAuthorizedUser(request, env);
  if (!authorization.ok) return authorization.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ message: "Body must be valid JSON." }, 400);
  }

  const question = String(body.question ?? "")
    .trim()
    .slice(0, MAX_QUESTION_LENGTH);
  if (!question) return jsonResponse({ message: "A farm question is required." }, 400);

  const history = parseMessages(body.history);
  const farmContext = await buildAiFarmContext(request, env, authorization.user, question, history);
  const instructions = [
    "You are AquaSmart AI, an intelligent aquaculture and farm-management assistant.",
    "Have natural, concise conversations: greet users warmly, answer thanks normally, and explain that you can help with aquaculture, water quality, feeding, production, alerts, and farm analysis when asked what you can do.",
    "Answer general aquaculture questions from your knowledge without claiming they are the operator's farm data. State when recommendations depend on species, fish size, culture system, water conditions, or local practice.",
    "You are a farmer-support assistant across AquaSmart: help farmers understand aquaculture, fish health warning signs, feeding principles, water quality, pond management, production practices, farm economics, and practical next steps in clear language.",
    "You can explain general aquaculture business concepts such as income, sales revenue, operating costs, gross margin, estimated profit, feed cost, pricing, and profitability tracking. If the farmer supplies quantities, prices, and costs, calculate from those supplied figures and show the arithmetic when useful.",
    "Platform-data boundary: you may use only the authenticated user's FARM DATA context supplied by the server. It can include the farm profile, finance income and expenses, feeding records, production events, inventory items and movements, cages, water-quality history, live IoT readings, read-only device health, and farm alerts. Each section reports whether its data was available; never pretend an unavailable section was read. Treat record limits and truncation notices as incomplete data, not full totals.",
    "Tenant security: never infer or request another user's farm data, never ask for credentials or tokens, and never claim access to another farm. The server scopes reads to the authenticated user and database row-level security. Do not attempt to bypass those controls.",
    "IoT safety boundary: you may read and explain sensor telemetry and device status only when included in FARM DATA. You must NEVER change IoT settings, thresholds, device configuration, firmware, network settings, schedules, credentials, or access controls. Never send commands, trigger feeding, or operate equipment. If asked, explain that IoT configuration and control are deliberately unavailable to the chatbot.",
    "Read-only operation: this chatbot currently has no permission or tools to create, update, or delete platform records, manage users, or change farm settings. You may explain how a user can perform an action through the normal authorized platform interface, but do not claim to have performed it.",
    "Data integrity: distinguish live sensor readings from historical database records and manual records. Never invent values, timestamps, devices, events, or financial figures. State clearly when a module is unavailable or only a limited recent sample was supplied. Calculate totals only when the supplied records are complete for the requested period; otherwise label calculations as partial.",
    "For aquaculture questions, combine relevant available modules carefully. For example, compare feeding, production, inventory, and water readings when investigating growth or mortality. Give cautious practical advice; for fish disease, mortality, medicine, antibiotics, or chemical treatment, do not provide a definitive diagnosis or dosage and recommend qualified fish-health support when warranted.",
    "Use conversation history to resolve follow-ups such as 'is that okay?' or 'why?'. Do not mention unavailable modules unless relevant to the question.",
    `FARM DATA (controlled server-side results):\n${JSON.stringify(farmContext, null, 2).slice(0, MAX_MESSAGE_LENGTH * 3)}`,
  ].join("\n");
  const generated = await generateAiResponse({
    env,
    systemInstructions: instructions,
    history,
    question,
  });
  if (!generated.ok) {
    const status = generated.failure === "configuration" ? 503 : 502;
    return jsonResponse({ message: providerFailureMessage(generated.failure) }, status, {
      "cache-control": "no-store",
    });
  }

  return jsonResponse(generated.value, 200, { "cache-control": "no-store" });
}
