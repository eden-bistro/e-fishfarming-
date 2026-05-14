import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "ai"; text: string };

const suggestions = [
  "Why is my dissolved oxygen low?",
  "Best feeding time for tilapia?",
  "Diagnose pale gills in fish",
  "How to reduce ammonia naturally?",
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hi John 👋 I'm your AquaSmart assistant. Ask me about water quality, feeding, fish health, or finances.",
    },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Connect Lovable AI to enable real-time recommendations. I'll analyze your sensor data and suggest actions.",
        },
      ]);
    }, 600);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
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
              <p className="text-[11px] opacity-90">Smart farming assistant</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "ai" && (
                  <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand text-brand-foreground"
                      : "rounded-bl-sm bg-card shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t bg-card p-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the AI assistant…"
                className="h-9"
              />
              <Button size="icon" type="submit" className="h-9 w-9 bg-brand hover:bg-brand/90">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
