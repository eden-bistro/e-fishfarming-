import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/feeding/schedule")({
  head: () => ({ meta: [{ title: "Feeding Schedule — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows] = useState<FeedScheduleRow[]>([]);
  const [form, setForm] = useState({ time: "", amountKg: "", pond: "" });

  const totalKg = useMemo(() => rows.reduce((sum, r) => sum + r.amountKg, 0), [rows]);

  function addSchedule() {
    const amount = Number(form.amountKg);
    if (!form.time || !form.pond.trim() || Number.isNaN(amount) || amount <= 0) return;

    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        time: form.time,
        pond: form.pond.trim(),
        amountKg: amount,
      },
    ]);
    setForm({ time: "", amountKg: "", pond: "" });
  }

  return (
    <DashboardLayout title="Feeding Schedule" subtitle="No scheduled feed sessions yet.">
      <Card>
        <CardHeader><CardTitle className="text-base">Today's Plan</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No feeding schedule data available.</CardContent>
      </Card>
    </DashboardLayout>
  );
}
