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

  const model = config.AI_MODEL?.trim() || "llama-3.3-70b-versatile";
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
      body: JSON.stringify({ model, messages, max_tokens: 700, temperature: 0.3 }),
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
    "Use only the relevant controlled FARM DATA sections below for AquaSmart-specific facts. Never invent readings, records, device states, production, financial figures, or actions. A section marked unavailable means the data cannot be verified.",
    "Use conversation history to resolve follow-ups such as 'is that okay?' or 'why?'. Do not mention unavailable telemetry for greetings or purely general questions.",
    "For disease, mortality, medicine, antibiotics, or chemical treatments, avoid definitive diagnosis and dosage. Ask for observations where useful and recommend fish-health or veterinary support when warranted.",
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
