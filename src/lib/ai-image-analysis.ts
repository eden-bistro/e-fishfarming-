import { getAuthorizedUser } from "@/lib/server-authz";
import { getEnvRecord, jsonResponse } from "@/lib/iot-firebase";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_QUESTION_LENGTH = 1_000;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ImageRequest = {
  imageBase64?: unknown;
  mimeType?: unknown;
  question?: unknown;
};

function isSupportedImage(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

function imageInstructions(): string {
  return [
    "You are AquaSmart's visual aquaculture assistant.",
    "Describe only what is reasonably visible in the submitted image. Separate direct observations from hypotheses.",
    "If the image shows fish, you may describe visible abnormalities such as discoloration, lesions, damaged fins, or unusual body appearance, but never provide a definitive disease diagnosis from an image alone.",
    "Do not claim an exact fish count, length, weight, water chemistry, dissolved oxygen, or ammonia value unless the image and method genuinely support that measurement.",
    "If asked to estimate fish count, clearly label it as an estimate and explain visibility limitations.",
    "For fish size, explain that reliable measurement requires a known-size reference or camera calibration.",
    "For water appearance, do not infer chemical water quality from color or appearance alone.",
    "Give cautious, practical next steps. Recommend checking actual water-quality readings and consulting a qualified aquaculture or fish-health professional if fish are distressed or mortality is occurring.",
    "If the image is unclear or not relevant to aquaculture, say so plainly. Do not invent details.",
  ].join("\n");
}

export async function handleAiImageAnalysis(request: Request, env: unknown): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  }
  if (request.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405, {
      allow: "POST, OPTIONS",
      "cache-control": "no-store",
    });
  }

  const authorization = await getAuthorizedUser(request, env);
  if (!authorization.ok) return authorization.response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  // Base64 expands data by roughly one third; reject oversized requests before parsing JSON.
  if (contentLength > MAX_IMAGE_BYTES * 1.4 + 50_000) {
    return jsonResponse({ message: "Image is too large. Maximum supported size is 4 MB." }, 413, {
      "cache-control": "no-store",
    });
  }

  let body: ImageRequest;
  try {
    body = (await request.json()) as ImageRequest;
  } catch {
    return jsonResponse({ message: "Body must be valid JSON." }, 400, {
      "cache-control": "no-store",
    });
  }

  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const question =
    typeof body.question === "string" ? body.question.trim().slice(0, MAX_QUESTION_LENGTH) : "";

  if (!SUPPORTED_TYPES.has(mimeType)) {
    return jsonResponse({ message: "Use a JPEG, PNG, or WebP image." }, 415, {
      "cache-control": "no-store",
    });
  }
  if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return jsonResponse({ message: "A valid base64-encoded image is required." }, 400, {
      "cache-control": "no-store",
    });
  }
  if (imageBase64.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 8) {
    return jsonResponse({ message: "Image is too large. Maximum supported size is 4 MB." }, 413, {
      "cache-control": "no-store",
    });
  }

  let bytes: Uint8Array;
  try {
    const binary = atob(imageBase64);
    if (binary.length > MAX_IMAGE_BYTES) {
      return jsonResponse({ message: "Image is too large. Maximum supported size is 4 MB." }, 413, {
        "cache-control": "no-store",
      });
    }
    bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return jsonResponse({ message: "The image data could not be decoded." }, 400, {
      "cache-control": "no-store",
    });
  }

  if (!isSupportedImage(bytes, mimeType)) {
    return jsonResponse(
      { message: "The file content does not match the selected image type." },
      415,
      { "cache-control": "no-store" },
    );
  }

  const config = getEnvRecord(env);
  const provider = (config.AI_PROVIDER ?? "groq").trim().toLowerCase();
  const apiKey = config.AI_API_KEY?.trim();
  const model = config.AI_VISION_MODEL?.trim() || "qwen/qwen3.8-27b";
  if (provider !== "groq" || !apiKey) {
    return jsonResponse(
      {
        message:
          "AquaSmart image AI is not configured. Ask the administrator to set the server-side AI_API_KEY and AI_VISION_MODEL.",
      },
      503,
      { "cache-control": "no-store" },
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: imageInstructions() },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  question ||
                  "Analyze this image for aquaculture observations. Describe visible evidence, limitations, and safe next steps.",
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_completion_tokens: 800,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return jsonResponse(
      { message: "Image AI is temporarily unavailable. Please try again." },
      502,
      { "cache-control": "no-store" },
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;
  if (!response.ok) {
    console.error("[ai-image-analysis] Groq request failed", response.status);
    return jsonResponse(
      {
        message:
          response.status === 401 || response.status === 403
            ? "Image AI credentials or model configuration are invalid."
            : response.status === 429
              ? "Image AI is temporarily busy. Please try again shortly."
              : "Image AI could not process this image right now.",
      },
      response.status === 429 ? 429 : 502,
      { "cache-control": "no-store" },
    );
  }

  const content = payload?.choices?.[0]?.message?.content;
  const analysis =
    typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content
            .filter(
              (part): part is { text: string } =>
                Boolean(part) &&
                typeof part === "object" &&
                typeof (part as { text?: unknown }).text === "string",
            )
            .map((part) => part.text)
            .join("\n")
            .trim()
        : "";

  if (!analysis) {
    return jsonResponse(
      { message: "Image AI returned no usable findings. Please try again." },
      502,
      { "cache-control": "no-store" },
    );
  }

  return jsonResponse(
    {
      analysis,
      model,
      persisted: false,
      notice:
        "This analysis is not saved to AquaSmart history. It may be imperfect and is not a veterinary diagnosis.",
    },
    200,
    { "cache-control": "no-store" },
  );
}
