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

function aiReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("dissolved oxygen") || q.includes("oxygen") || q.includes("do low")) {
    return "Low dissolved oxygen usually comes from overfeeding, algae die-off, or high night-time respiration. Immediate steps: increase aeration, pause/reduce feeding for 12–24h, siphon sludge, and check early-morning DO trend. Target >5 mg/L for tilapia ponds.";
  }

  if (q.includes("ammonia")) {
    return "To reduce ammonia: stop overfeeding, remove settled waste, improve biofiltration/aeration, and do partial water exchange. Keep pH stable, because higher pH increases toxic NH3 fraction. Track TAN daily until it returns to safe range.";
  }

  if (q.includes("feeding") || q.includes("tilapia")) {
    return "For tilapia, split feed into 3–5 sessions during warm daylight hours when oxygen is stronger. Start with biomass-based ration, then adjust by appetite, FCR trend, water temperature, and DO. Avoid heavy feeding when DO is low or fish are stressed.";
  }

  if (q.includes("pale gills") || q.includes("gills") || q.includes("sick") || q.includes("disease")) {
    return "Pale gills can indicate anemia, parasite load, or chronic stress/poor water quality. Isolate affected fish, test ammonia/nitrite/DO immediately, inspect for external parasites, and reduce stressors. If mortality rises, consult a fish health vet for targeted diagnosis and treatment.";
  }

  if (q.includes("profit") || q.includes("expense") || q.includes("finance") || q.includes("pnl")) {
    return "For stronger farm profitability, track feed cost per kg gain, survival rate, growth cycle days, and sale price by batch. Most gains come from feed efficiency improvements, survival optimization, and reducing emergency water-quality events.";
  }

  return "Understood. I can help with water quality, feeding optimization, fish health triage, and farm finance decisions. Share your current readings (DO, pH, temperature, ammonia, nitrite) and I’ll suggest a step-by-step action plan.";
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "AquaSmart AI ready. Ask about water quality, feeding plans, fish health, or farm profitability.",
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
      setMessages((m) => [...m, { role: "ai", text: aiReply(t) }]);
    }, 250);
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
              <p className="text-[11px] opacity-90">Operational assistant</p>
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
                placeholder="Ask AquaSmart AI…"
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
