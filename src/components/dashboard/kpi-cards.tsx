import { useEffect, useState } from "react";
import { Droplets, UtensilsCrossed, Wallet, Timer, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";

function formatCountdown(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function KpiCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  link,
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  link: { href: string; text: string };
  trend?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {trend}
        </div>
        <div className="mt-4 border-t pt-3">
          <Link
            to={link.href as never}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            {link.text} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const [count, setCount] = useState(8130); // seconds
  useEffect(() => {
    const t = setInterval(() => setCount((c) => (c <= 0 ? 14400 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<Droplets className="h-6 w-6" />}
        iconBg="bg-info/15"
        iconColor="text-info"
        label="Water Quality"
        value={<span className="text-success">Good</span>}
        sub="All parameters normal"
        link={{ href: "/water/live", text: "View Details" }}
      />
      <KpiCard
        icon={<Timer className="h-6 w-6" />}
        iconBg="bg-brand/15"
        iconColor="text-brand"
        label="Next Feeding"
        value={<span className="font-mono">{formatCountdown(count)}</span>}
        sub="Today, 03:00 PM"
        link={{ href: "/feeding/schedule", text: "View Schedule" }}
      />
      <KpiCard
        icon={<UtensilsCrossed className="h-6 w-6" />}
        iconBg="bg-success/15"
        iconColor="text-success"
        label="Today's Feed"
        value={
          <>
            12.5 <span className="text-base font-medium text-muted-foreground">kg</span>
          </>
        }
        sub="3 feedings completed"
        link={{ href: "/feeding/history", text: "Feed History" }}
      />
      <KpiCard
        icon={<Wallet className="h-6 w-6" />}
        iconBg="bg-warning/15"
        iconColor="text-warning"
        label="Today's Profit"
        value={<>KSh 12,050</>}
        sub={<span className="text-success">+15.6% vs yesterday</span>}
        link={{ href: "/finance/pnl", text: "View Financials" }}
      />
    </div>
  );
}
