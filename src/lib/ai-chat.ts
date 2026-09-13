import { getAuthorizedUser } from "@/lib/server-authz";
import { getEnvRecord, jsonResponse } from "@/lib/iot-firebase";
import { buildAiFarmContext } from "@/lib/ai-farm-context";

type ChatMessage = { role: "user" | "assistant"; text: string };

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

function outputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string") return response.output_text.trim();
  if (!Array.isArray(response.output)) return "";

  return response.output
    .flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !Array.isArray((item as { content?: unknown }).content)
      )
        return [];
      return (item as { content: Array<{ type?: unknown; text?: unknown }> }).content;
    })
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n")
    .trim();
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

  const apiKey = getEnvRecord(env).OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return jsonResponse(
      { message: "AquaSmart AI is not configured. Set OPENAI_API_KEY on the server." },
      503,
    );
  }

  const history = parseMessages(body.history);
  const farmContext = await buildAiFarmContext(request, env, authorization.user, question, history);
  const model = getEnvRecord(env).OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const instructions = [
    "You are AquaSmart AI, an intelligent aquaculture and farm-management assistant.",
    "Have natural, concise conversations: greet users warmly, answer thanks normally, and explain that you can help with aquaculture, water quality, feeding, production, alerts, and farm analysis when asked what you can do.",
    "Answer general aquaculture questions from your knowledge without claiming they are the operator's farm data. State when recommendations depend on species, fish size, culture system, water conditions, or local practice.",
    "Use only the relevant controlled FARM DATA sections below for AquaSmart-specific facts. Never invent readings, records, device states, production, financial figures, or actions. A section marked unavailable means the data cannot be verified.",
    "Use conversation history to resolve follow-ups such as 'is that okay?' or 'why?'. Do not mention unavailable telemetry for greetings or purely general questions.",
    "For disease, mortality, medicine, antibiotics, or chemical treatments, avoid definitive diagnosis and dosage. Ask for observations where useful and recommend fish-health or veterinary support when warranted.",
    `FARM DATA (controlled server-side results):\n${JSON.stringify(farmContext, null, 2).slice(0, MAX_MESSAGE_LENGTH * 3)}`,
  ].join("\n");
  const conversation = history
    .map((message) => `${message.role === "assistant" ? "Assistant" : "Operator"}: ${message.text}`)
    .join("\n");
  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: `${conversation ? `Conversation so far:\n${conversation}\n\n` : ""}Current operator question: ${question}`,
        },
      ],
    },
  ];

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, instructions, input, max_output_tokens: 700 }),
    });
  } catch {
    return jsonResponse(
      { message: "AquaSmart AI could not reach the model. Please try again." },
      502,
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("[ai-chat] model request failed", response.status, payload);
    return jsonResponse(
      { message: "AquaSmart AI could not complete that request. Please try again." },
      502,
    );
  }

  const answer = outputText(payload);
  if (!answer)
    return jsonResponse({ message: "AquaSmart AI returned no answer. Please try again." }, 502);
  return jsonResponse({ answer }, 200, { "cache-control": "no-store" });
}
