import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserRecord, loadCurrentUserFarmProfile, saveCurrentUserFarm } from "@/lib/auth";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  });
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadFarm() {
      const farm = await loadCurrentUserFarmProfile();
      if (!farm || cancelled) return;
      setForm({
        name: farm.name ?? "",
        location: farm.location ?? "",
        owner: farm.owner ?? currentUser?.name ?? "",
        currency: farm.currency ?? "",
        totalPonds: farm.totalPonds?.toString() ?? "",
        totalStockKg: farm.totalStockKg?.toString() ?? "",
      });
    }
    void loadFarm();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.name]);

  async function saveFarm() {
    setSaved(false);
    if (!form.name.trim() || !form.location.trim() || !form.owner.trim() || !form.currency.trim()) {
      setMessage("Farm name, location, owner and currency are required.");
      return;
    }

    const totalPonds = form.totalPonds ? Number(form.totalPonds) : null;
    const totalStockKg = form.totalStockKg ? Number(form.totalStockKg) : null;
    if (
      (totalPonds !== null && (!Number.isFinite(totalPonds) || totalPonds < 0)) ||
      (totalStockKg !== null && (!Number.isFinite(totalStockKg) || totalStockKg < 0))
    ) {
      setMessage("Total cages/ponds and total stock must be valid positive numbers.");
      return;
    }

    const result = await saveCurrentUserFarm({
      name: form.name.trim(),
      location: form.location.trim(),
      owner: form.owner.trim(),
      currency: form.currency.trim().toUpperCase(),
      totalPonds,
      totalStockKg,
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSaved(true);
    setMessage(
      "Farm profile saved. You can manage cages separately and keep device setup admin-only.",
    );
  }

  return (
    <DashboardLayout
      title="Farm Settings"
      subtitle="Create and manage the farm profile anytime. Cage records and device links are handled in their own sections."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fish className="h-4 w-4 icon-emphasis" /> Farm Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Farm setup is always available</AlertTitle>
              <AlertDescription>
                Save the farm details first. You can add cages in Cage Management and continue using
                finance, inventory, production, and reports even before any device is connected.
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
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">1. Save farm profile</p>
                <p className="mt-1">Store the farm name, location, owner, and currency.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">2. Manage cages separately</p>
                <p className="mt-1">Use Cage Management to add cages, fish counts, and biomass.</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="font-medium text-foreground">3. Admin connects devices</p>
                <p className="mt-1">
                  Device assignment and setup tokens stay admin-only for safety.
                </p>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Device setup is optional for farm creation</AlertTitle>
            <AlertDescription>
              Farmers can create and update farm records before devices are available. Live water
              readings only appear after an admin links an online device to the right cage.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <div className="space-y-2">
        <Button onClick={() => void saveFarm()} className="min-h-11 w-full sm:w-auto">
          Save Farm Profile
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
