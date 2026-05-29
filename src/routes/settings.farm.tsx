import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserRecord, saveCurrentUserFarm } from "@/lib/auth";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

  function saveFarm() {
    if (!form.name.trim() || !form.location.trim() || !form.owner.trim() || !form.currency.trim()) {
      setMessage("Farm name, location, owner and currency are required.");
      return;
    }

    const totalPonds = form.totalPonds ? Number(form.totalPonds) : null;
    const totalStockKg = form.totalStockKg ? Number(form.totalStockKg) : null;
    if (
      (totalPonds !== null && Number.isNaN(totalPonds)) ||
      (totalStockKg !== null && Number.isNaN(totalStockKg))
    ) {
      setMessage("Total ponds and total stock must be valid numbers.");
      return;
    }

    const result = saveCurrentUserFarm({
      name: form.name.trim(),
      location: form.location.trim(),
      owner: form.owner.trim(),
      currency: form.currency.trim(),
      totalPonds,
      totalStockKg,
    });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("Farm profile saved successfully.");
  }

  return (
    <DashboardLayout title="Farm Settings" subtitle="General farm details and preferences.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Farm Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Farm Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter farm name"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Enter location"
            />
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <Input
              value={form.owner}
              onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
              placeholder="Owner full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
              placeholder="Currency"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Ponds</Label>
            <Input
              value={form.totalPonds}
              onChange={(e) => setForm((prev) => ({ ...prev, totalPonds: e.target.value }))}
              type="number"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Stock (kg)</Label>
            <Input
              value={form.totalStockKg}
              onChange={(e) => setForm((prev) => ({ ...prev, totalStockKg: e.target.value }))}
              type="number"
            />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <Button onClick={saveFarm}>Save Changes</Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </DashboardLayout>
  );
}
