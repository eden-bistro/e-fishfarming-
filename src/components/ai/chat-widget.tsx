import { useEffect, useRef, useState } from "react";
import { Bot, ImagePlus, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUserRecord } from "@/lib/auth";
import { getAccessToken } from "@/services/auth.service";

type Message = { role: "user" | "assistant"; text: string };

const HISTORY_LIMIT = 12;

function historyKey() {
  return `aquasmart_ai_chat:${getCurrentUserRecord()?.id ?? "anonymous"}`;
}

function readHistory(): Message[] {
  try {
    const raw = window.localStorage.getItem(historyKey());
    if (!raw) return [];
    const history = JSON.parse(raw) as unknown;
    if (!Array.isArray(history)) return [];
    return history
      .filter(
        (message): message is Message =>
          Boolean(message) &&
          typeof message === "object" &&
          (message as Message).role !== undefined &&
          ["user", "assistant"].includes((message as Message).role) &&
          typeof (message as Message).text === "string",
      )
      .slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function writeHistory(messages: Message[]) {
  try {
    window.localStorage.setItem(historyKey(), JSON.stringify(messages.slice(-HISTORY_LIMIT)));
  } catch {
    // The current conversation remains usable if browser storage is unavailable.
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(readHistory());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isThinking]);

  const send = async (text: string) => {
    const question = text.trim();
    const image = selectedImage;
    if ((!question && !image) || isThinking) return;

    const prompt = question || "Please analyze this aquaculture image.";
    const priorMessages = messages.slice(-HISTORY_LIMIT);
    const userText = image ? `${prompt} [Image: ${image.name}]` : prompt;
    const nextMessages = [...priorMessages, { role: "user" as const, text: userText }];
    setMessages(nextMessages);
    setInput("");
    setSelectedImage(null);
    setUploadError("");
    setIsThinking(true);

    try {
      const accessToken = await getAccessToken();
      let endpoint = "/api/ai/chat";
      let requestBody: Record<string, unknown> = { question: prompt, history: priorMessages };

      if (image) {
        endpoint = "/api/ai/analyze-image";
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image."));
          reader.onerror = () => reject(new Error("Could not read image."));
          reader.readAsDataURL(image);
        });
        const separator = imageDataUrl.indexOf(",");
        if (separator < 0) throw new Error("The selected image could not be encoded.");
        requestBody = {
          question: prompt,
          mimeType: image.type,
          imageBase64: imageDataUrl.slice(separator + 1),
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json().catch(() => null)) as {
        answer?: string;
        analysis?: string;
        message?: string;
        notice?: string;
      } | null;
      const resultText = image
        ? [payload?.analysis, payload?.notice].filter(Boolean).join("\\n\\n")
        : payload?.answer;
      if (!response.ok || !resultText) {
        throw new Error(payload?.message ?? `The AI request failed (${response.status}).`);
      }

      const completedMessages = [
        ...nextMessages,
        { role: "assistant" as const, text: resultText },
      ];
      setMessages(completedMessages);
      writeHistory(completedMessages);
    } catch (error) {
      const failure: Message = {
        role: "assistant",
        text:
          error instanceof Error
            ? error.message
            : "AquaSmart AI could not answer that question right now.",
      };
      const completedMessages = [...nextMessages, failure];
      setMessages(completedMessages);
      writeHistory(completedMessages);
    } finally {
      setIsThinking(false);
    }
  };

  const selectImage = (file?: File) => {
    setUploadError("");
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSelectedImage(null);
      setUploadError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSelectedImage(null);
      setUploadError("Image must be 4 MB or smaller.");
      return;
    }
    setSelectedImage(file);
  };

  return (
    <>
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg shadow-brand/30 transition hover:scale-105"
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b bg-gradient-to-r from-brand to-info px-4 py-3 text-brand-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">AquaSmart AI</p>
              <p className="text-[11px] opacity-90">Live farm assistant</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.length === 0 && (
              <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                Ask about aquaculture, your farm, water quality, feeding, or farm management.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "rounded-br-sm bg-brand text-brand-foreground" : "rounded-bl-sm bg-card shadow-sm"}`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm shadow-sm">
                Analyzing your farm question…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {selectedImage && (
            <div className="flex items-center gap-2 border-t bg-card px-3 py-2 text-xs">
              <ImagePlus className="h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate">{selectedImage.name}</span>
              <button type="button" onClick={() => selectImage(undefined)} className="text-muted-foreground hover:text-foreground" aria-label="Remove selected image">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {uploadError && <p className="px-3 pb-1 text-xs text-destructive">{uploadError}</p>}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t bg-card p-2"
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => selectImage(event.target.files?.[0])}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              disabled={isThinking}
              onClick={() => imageInputRef.current?.click()}
              aria-label="Attach an image for analysis"
              title="Analyze an image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={selectedImage ? "Ask about this image…" : "Ask AquaSmart AI…"}
              className="h-9"
              disabled={isThinking}
            />
            <Button
              size="icon"
              type="submit"
              className="h-9 w-9 bg-brand hover:bg-brand/90"
              disabled={isThinking || (!input.trim() && !selectedImage)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
