import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentUserRecord } from "@/lib/auth";
import { getAccessToken } from "@/services/auth.service";
import { getLatestOnlineWaterReading, type WaterReading } from "@/lib/platform-clients";

type Message = { role: "user" | "assistant"; text: string };

const HISTORY_LIMIT = 12;
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

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

function formatReading(reading: WaterReading | null) {
  if (!reading) return "No live water telemetry is currently available.";

  const values = [
    ["temperature", reading.temperature, "°C"],
    ["pH", reading.ph, ""],
    ["dissolved oxygen", reading.dissolvedOxygen, " mg/L"],
    ["ammonia", reading.ammonia, " mg/L"],
    ["nitrite", reading.nitrite, " mg/L"],
    ["turbidity", reading.turbidity, ""],
  ] as const;
  const measurements = values
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([label, value, unit]) => `${label}: ${numberFormatter.format(Number(value))}${unit}`);

  return `Latest water telemetry (${reading.timestamp}, pond ${reading.pondId}): ${measurements.join(", ") || "no usable measurements"}.`;
}

async function getFarmContext() {
  try {
    return formatReading(await getLatestOnlineWaterReading());
  } catch (error) {
    return `Live water telemetry could not be read: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(readHistory());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isThinking]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isThinking) return;

    const priorMessages = messages.slice(-HISTORY_LIMIT);
    const nextMessages = [...priorMessages, { role: "user" as const, text: question }];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);

    try {
      const [accessToken, farmContext] = await Promise.all([getAccessToken(), getFarmContext()]);
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ question, history: priorMessages, farmContext }),
      });
      const payload = (await response.json().catch(() => null)) as {
        answer?: string;
        message?: string;
      } | null;
      if (!response.ok || !payload?.answer) {
        throw new Error(payload?.message ?? `The AI request failed (${response.status}).`);
      }

      const completedMessages = [
        ...nextMessages,
        { role: "assistant" as const, text: payload.answer },
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
                Ask a question about your farm. Answers use the current conversation and live
                telemetry.
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

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t bg-card p-2"
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask AquaSmart AI…"
              className="h-9"
              disabled={isThinking}
            />
            <Button
              size="icon"
              type="submit"
              className="h-9 w-9 bg-brand hover:bg-brand/90"
              disabled={isThinking || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
