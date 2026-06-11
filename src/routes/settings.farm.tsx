import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserRecord, saveCurrentUserFarm } from "@/lib/auth";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Fish, Info, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/settings/farm")({
  head: () => ({ meta: [{ title: "Farm Settings — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const currentUser = getCurrentUserRecord();
  const currentFarm = currentUser?.farm;
  const [form, setForm] = useState({
    name: currentFarm?.name ?? "",
    location: currentFarm?.location ?? "",
    owner: currentFarm?.owner ?? currentUser?.name ?? "",
    currency: currentFarm?.currency ?? "",
    totalPonds: currentFarm?.totalPonds?.toString() ?? "",
    totalStockKg: currentFarm?.totalStockKg?.toString() ?? "",
    cageNames: currentFarm?.cageNames?.join("\n") ?? "",
  });
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  function saveFarm() {
    setSaved(false);
    if (!form.name.trim() || !form.location.trim() || !form.owner.trim() || !form.currency.trim()) {
      setMessage("Farm name, location, owner and currency are required.");
      return;
    }

    const totalPonds = form.totalPonds ? Number(form.totalPonds) : null;
    const totalStockKg = form.totalStockKg ? Number(form.totalStockKg) : null;
    if (
      (totalPonds !== null && (Number.isNaN(totalPonds) || totalPonds < 0)) ||
      (totalStockKg !== null && (Number.isNaN(totalStockKg) || totalStockKg < 0))
    ) {
      setMessage("Total cages/ponds and total stock must be valid positive numbers.");
      return;
    }

    const cageNames = form.cageNames
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    const result = saveCurrentUserFarm({
      name: form.name.trim(),
      location: form.location.trim(),
      owner: form.owner.trim(),
      currency: form.currency.trim().toUpperCase(),
      totalPonds,
      totalStockKg,
      cageNames,
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSaved(true);
    setMessage(
      "Farm and cage profile saved. Ask an admin to connect ESP32 devices to cages when ready.",
    );
  }

  return (
    <DashboardLayout
      title="Farm Settings"
      subtitle="Create your farm profile and cage list. Device-to-cage communication is connected by an administrator."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fish className="h-4 w-4 icon-emphasis" /> Farm and Cage Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Simple setup flow</AlertTitle>
              <AlertDescription>
                First save your farm details, then list the cages or ponds farmers use every day. A
                system admin will later link ESP32 devices to the correct cage for live data.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Farm Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Lake View Tilapia Farm"
                  autoComplete="organization"
                />
                <p className="text-xs text-muted-foreground">Use the name your team recognizes.</p>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Kisumu, Kenya"
                  autoComplete="address-level2"
                />
                <p className="text-xs text-muted-foreground">Town, county, site, or GPS label.</p>
              </div>
              <div className="space-y-2">
                <Label>Owner / Manager</Label>
                <Input
                  value={form.owner}
                  onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
                  placeholder="Owner or manager full name"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                  placeholder="e.g. KES, USD, RWF"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Cages / Ponds</Label>
                <Input
                  value={form.totalPonds}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalPonds: e.target.value }))}
                  type="number"
                  min="0"
                  placeholder="e.g. 6"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Stock (kg)</Label>
                <Input
                  value={form.totalStockKg}
                  onChange={(e) => setForm((prev) => ({ ...prev, totalStockKg: e.target.value }))}
                  type="number"
                  min="0"
                  placeholder="e.g. 1250"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cage / Pond Names</Label>
              <Textarea
                value={form.cageNames}
                onChange={(e) => setForm((prev) => ({ ...prev, cageNames: e.target.value }))}
                placeholder={"Cage 001\nCage 002\nNursery Pond"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Enter one cage or pond per line. These are farm records only; live device
                communication is activated by an admin on the Devices page.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">1. Create farm profile</p>
                <p className="mt-1">Save the farm name, location, owner and currency.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">2. Add cage names</p>
                <p className="mt-1">Use names your workers already use on site.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">3. Admin connects devices</p>
                <p className="mt-1">
                  ESP32-to-cage communication and setup tokens stay admin-only for safety.
                </p>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Device communication is admin-only</AlertTitle>
            <AlertDescription>
              Farmers can create farm and cage records here. An admin links ESP32 hardware to each
              cage so live water readings come from trusted online devices.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <div className="space-y-2">
        <Button onClick={saveFarm} className="min-h-11 w-full sm:w-auto">
          Save Farm and Cages
        </Button>
        {message && (
          <p className={`text-sm ${saved ? "text-success" : "text-muted-foreground"}`}>
            {saved && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
            {message}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
