import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLatestWaterReading, type WaterReading } from "@/lib/platform-clients";
import { listEnterpriseAlerts } from "@/services/modules/alerts.service";
import { buildProductionIntelligence } from "@/services/modules/production-intelligence.service";

// Lightweight in-app assistant. It is intentionally deterministic so it can answer
// farm operations questions without requiring an external LLM key in production.
type Msg = { role: "user" | "ai"; text: string };

type ChatContext = {
  latestWater: WaterReading | null;
  latestWaterError: string | null;
};

type ReadingAssessment = {
  label: string;
  value: string;
  status: "good" | "watch" | "danger";
  advice: string;
};

const suggestions = [
  "What is my water status now?",
  "Should I feed today?",
  "Why is my dissolved oxygen low?",
  "How can I improve profit?",
];

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function normalize(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function formatReadingNumber(value: number, unit = "") {
  return `${numberFormatter.format(value)}${unit}`;
}

function assessLatestWater(reading: WaterReading | null): ReadingAssessment[] {
  if (!reading) return [];

  const assessments: ReadingAssessment[] = [];
  const dissolvedOxygen = Number(reading.dissolvedOxygen);
  const ph = Number(reading.ph);
  const temperature = Number(reading.temperature);
  const ammonia = Number(reading.ammonia);
  const nitrite = Number(reading.nitrite);
  const turbidity = Number(reading.turbidity);

  if (Number.isFinite(dissolvedOxygen)) {
    assessments.push({
      label: "Dissolved oxygen",
      value: formatReadingNumber(dissolvedOxygen, " mg/L"),
      status: dissolvedOxygen < 4 ? "danger" : dissolvedOxygen < 5 ? "watch" : "good",
      advice:
        dissolvedOxygen < 5
          ? "increase aeration, reduce feeding, and check early-morning oxygen"
          : "oxygen is in a safe operating range",
    });
  }

  if (Number.isFinite(ph)) {
    assessments.push({
      label: "pH",
      value: formatReadingNumber(ph),
      status: ph < 6.5 || ph > 9 ? "danger" : ph < 7 || ph > 8.5 ? "watch" : "good",
      advice:
        ph < 6.5 || ph > 9
          ? "avoid sudden correction; retest and adjust alkalinity gradually"
          : "keep tracking morning/evening pH swings",
    });
  }

  if (Number.isFinite(temperature)) {
    assessments.push({
      label: "Temperature",
      value: formatReadingNumber(temperature, "°C"),
      status: temperature < 24 || temperature > 34 ? "watch" : "good",
      advice:
        temperature < 24 || temperature > 34
          ? "adjust feeding because appetite and oxygen demand change outside the ideal range"
          : "temperature is suitable for normal feeding",
    });
  }

  if (Number.isFinite(ammonia)) {
    assessments.push({
      label: "Ammonia",
      value: formatReadingNumber(ammonia, " mg/L"),
      status: ammonia > 0.1 ? "danger" : ammonia > 0.05 ? "watch" : "good",
      advice:
        ammonia > 0.05
          ? "pause overfeeding, remove sludge, boost aeration/biofiltration, and consider partial water exchange"
          : "ammonia is currently low",
    });
  }

  if (Number.isFinite(nitrite)) {
    assessments.push({
      label: "Nitrite",
      value: formatReadingNumber(nitrite, " mg/L"),
      status: nitrite > 0.5 ? "danger" : nitrite > 0.2 ? "watch" : "good",
      advice:
        nitrite > 0.2
          ? "increase aeration, reduce feeding, and verify biofilter performance"
          : "nitrite is currently low",
    });
  }

  if (Number.isFinite(turbidity)) {
    assessments.push({
      label: "Turbidity",
      value: formatReadingNumber(turbidity),
      status: turbidity > 80 ? "watch" : "good",
      advice:
        turbidity > 80
          ? "check suspended solids, plankton bloom, and uneaten feed"
          : "turbidity does not look elevated",
    });
  }

  return assessments;
}

function waterSummary(context: ChatContext): string {
  if (!context.latestWater) {
    return context.latestWaterError
      ? `I tried to read the latest Firebase telemetry but could not load it (${context.latestWaterError}). Check /api/iot/latest, Firebase env vars, and the device heartbeat.`
      : "I do not have a latest water reading yet. Send one device reading first, then ask again for live DO, pH, temperature, ammonia, nitrite, and turbidity advice.";
  }

  const assessments = assessLatestWater(context.latestWater);
  const danger = assessments.filter((item) => item.status === "danger");
  const watch = assessments.filter((item) => item.status === "watch");
  const status = danger.length > 0 ? "critical" : watch.length > 0 ? "needs attention" : "stable";
  const readings = assessments.map((item) => `${item.label}: ${item.value}`).join("; ");
  const actions = [...danger, ...watch].map((item) => `${item.label}: ${item.advice}`);

  return [
    `Latest water status is ${status}. ${readings}.`,
    actions.length > 0
      ? `Recommended action: ${actions.join("; ")}.`
      : "Recommended action: continue normal monitoring and keep feeding aligned with appetite and oxygen trends.",
  ].join(" ");
}

function productionSummary(): string {
  const intelligence = buildProductionIntelligence();
  const alerts = listEnterpriseAlerts();
  const critical = alerts.filter((alert) => alert.severity === "critical");
  const warnings = alerts.filter((alert) => alert.severity === "warning");

  return `Production snapshot: survival ${percentFormatter.format(intelligence.survivalRate)}%, biomass ${numberFormatter.format(Math.round(intelligence.currentBiomassKg))} kg, FCR ${numberFormatter.format(intelligence.overallFcr)}, feed used ${numberFormatter.format(intelligence.totalFeedKg)} kg. Alerts: ${critical.length} critical and ${warnings.length} warning. ${critical[0]?.message ? `Top issue: ${critical[0].message}.` : warnings[0]?.message ? `Top issue: ${warnings[0].message}.` : "No urgent enterprise alerts are active."}`;
}

function feedingAdvice(context: ChatContext): string {
  const reading = context.latestWater;
  if (!reading) {
    return "For feeding, use 3–5 smaller daytime meals, but first connect live water telemetry so I can decide from DO, temperature, ammonia, and pH. Do not feed heavily when fish are gasping, water smells bad, or early-morning oxygen is unknown.";
  }

  const dissolvedOxygen = Number(reading.dissolvedOxygen);
  const temperature = Number(reading.temperature);
  const ammonia = Number(reading.ammonia);
  const blockers: string[] = [];

  if (Number.isFinite(dissolvedOxygen) && dissolvedOxygen < 5) {
    blockers.push(`DO is ${formatReadingNumber(dissolvedOxygen, " mg/L")}`);
  }
  if (Number.isFinite(ammonia) && ammonia > 0.05) {
    blockers.push(`ammonia is ${formatReadingNumber(ammonia, " mg/L")}`);
  }
  if (Number.isFinite(temperature) && (temperature < 24 || temperature > 34)) {
    blockers.push(`temperature is ${formatReadingNumber(temperature, "°C")}`);
  }

  if (blockers.length > 0) {
    return `Reduce or pause feeding now because ${blockers.join(", ")}. Increase aeration, remove waste, retest water, then resume with a smaller ration only after fish appetite and oxygen recover.`;
  }

  return `You can follow normal feeding today. Current telemetry does not show a major feeding blocker. Split the ration into 3–5 daylight meals, watch appetite for 10–15 minutes, and stop when pellets remain uneaten.`;
}

function healthAdvice(question: string, context: ChatContext): string {
  const water = context.latestWater ? ` Current water context: ${waterSummary(context)}` : "";

  if (includesAny(question, ["pale gill", "gills", "white gill"])) {
    return `Pale gills can come from anemia, parasites, nitrite stress, or chronic poor water quality. First isolate weak fish, check gills/skin for parasites, test nitrite/ammonia/DO, and reduce handling stress.${water} If mortality increases, use a fish-health professional for microscopy and targeted treatment.`;
  }

  if (includesAny(question, ["mortality", "dying", "dead", "death"])) {
    return `For mortality: remove dead fish immediately, record cage and count, check DO before sunrise, test ammonia/nitrite/pH, inspect gills and skin, and stop feeding until the cause is clear.${water} If deaths continue for more than one day, escalate to lab/vet diagnosis.`;
  }

  return `For fish-health triage: observe swimming, appetite, gills, skin lesions, and mortality pattern; then compare those signs with water readings.${water || " Share DO, pH, temperature, ammonia, nitrite, symptoms, and mortality count for a more specific diagnosis."}`;
}

function financeAdvice(): string {
  const intelligence = buildProductionIntelligence();
  const fcrMessage =
    intelligence.overallFcr > 1.8
      ? `FCR is high at ${numberFormatter.format(intelligence.overallFcr)}, so feed conversion should be the first profit lever.`
      : `FCR is ${numberFormatter.format(intelligence.overallFcr)}, so keep protecting feed efficiency.`;

  return `${fcrMessage} To improve profit, track feed cost per kg gain, survival %, sale price/kg, mortality cost, and cycle length. Highest-impact actions: reduce wasted feed, prevent oxygen/ammonia events, harvest at target size, and separate finance entries by cage or batch.`;
}

async function buildChatContext(): Promise<ChatContext> {
  try {
    return { latestWater: await getLatestWaterReading(), latestWaterError: null };
  } catch (error) {
    return {
      latestWater: null,
      latestWaterError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function aiReply(question: string): Promise<string> {
  const q = normalize(question);
  const context = await buildChatContext();

  if (!q) return "Please type a farm question so I can help.";

  if (includesAny(q, ["hello", "hi ", "hey", "good morning", "good afternoon"])) {
    return "Hello! Ask me about live water readings, feeding, fish health, mortality, profit, FCR, inventory, Firebase telemetry, or what action to take next.";
  }

  if (
    includesAny(q, [
      "water",
      "reading",
      "telemetry",
      "sensor",
      "firebase",
      "status now",
      "current status",
    ])
  ) {
    return waterSummary(context);
  }

  if (includesAny(q, ["oxygen", " do ", "dissolved oxygen", "gasping", "aeration"])) {
    return `${waterSummary(context)} Low oxygen actions: run aerators immediately, reduce/stop feeding for 12–24 hours, remove sludge/uneaten feed, and check the lowest DO before sunrise.`;
  }

  if (includesAny(q, ["ammonia", "nh3", "tan"])) {
    return `${waterSummary(context)} Ammonia actions: stop overfeeding, remove solids, increase aeration and biofiltration, avoid sudden pH increases, and consider partial water exchange if levels keep rising.`;
  }

  if (includesAny(q, ["nitrite", "no2", "brown blood"])) {
    return `${waterSummary(context)} Nitrite actions: reduce feeding, improve biofilter oxygen, verify water exchange, and monitor fish for brown-blood stress or rapid gill movement.`;
  }

  if (includesAny(q, ["ph", "alkalinity", "acid", "alkaline"])) {
    return `${waterSummary(context)} pH actions: measure morning and evening pH, avoid fast corrections, stabilize alkalinity, and remember high pH makes ammonia more toxic.`;
  }

  if (includesAny(q, ["feed", "feeding", "ration", "pellet", "tilapia", "catfish", "eat"])) {
    return feedingAdvice(context);
  }

  if (
    includesAny(q, ["sick", "disease", "gill", "mortality", "dying", "dead", "parasite", "lesion"])
  ) {
    return healthAdvice(q, context);
  }

  if (includesAny(q, ["profit", "finance", "expense", "income", "pnl", "cost", "fcr", "margin"])) {
    return financeAdvice();
  }

  if (includesAny(q, ["production", "biomass", "harvest", "survival", "stock", "stocking"])) {
    return productionSummary();
  }

  if (includesAny(q, ["alert", "warning", "critical", "problem", "issue", "risk"])) {
    const alerts = listEnterpriseAlerts();
    if (alerts.length === 0) {
      return `No enterprise alerts are active right now. ${waterSummary(context)}`;
    }
    return `Active alerts: ${alerts
      .slice(0, 3)
      .map((alert) => `${alert.severity} ${alert.source} — ${alert.message}`)
      .join(
        "; ",
      )}. Start with critical alerts, then verify live water quality and feeding records.`;
  }

  return `I can answer that better with one more detail. Are you asking about water quality, feeding, fish disease/mortality, production/harvest, or finance? Current farm context: ${waterSummary(context)} ${productionSummary()}`;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "AquaSmart AI ready. Ask about live water status, feeding decisions, fish health, production, or profitability.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isThinking]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || isThinking) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setIsThinking(true);
    void aiReply(t)
      .then((reply) => {
        setMessages((m) => [...m, { role: "ai", text: reply }]);
      })
      .catch((error) => {
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            text: `I could not complete that answer. ${error instanceof Error ? error.message : String(error)}`,
          },
        ]);
      })
      .finally(() => setIsThinking(false));
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
              <p className="text-[11px] opacity-90">Live farm assistant</p>
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
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-br-sm bg-brand text-brand-foreground"
                      : "rounded-bl-sm bg-card shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                <div className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm shadow-sm">
                  Checking farm context…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t bg-card p-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={isThinking}
                  className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
        </div>
      )}
    </>
  );
}
