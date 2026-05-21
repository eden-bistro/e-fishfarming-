import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMemo, useState } from "react";
import {
  createCage,
  deleteCage,
  listCages,
  updateCage,
  type Cage,
} from "@/services/modules/cages.service";
import { Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/cages/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [rows, setRows] = useState<Cage[]>(listCages());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    fishPopulation: "0",
    biomassKg: "0",
    status: "active" as Cage["status"],
  });

  const totals = useMemo(
    () => ({
      totalCages: rows.length,
      totalFish: rows.reduce((acc, cur) => acc + cur.fishPopulation, 0),
      totalBiomass: rows.reduce((acc, cur) => acc + cur.biomassKg, 0),
    }),
    [rows],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", location: "", fishPopulation: "0", biomassKg: "0", status: "active" });
  };

  const submit = () => {
    if (!form.name.trim() || !form.location.trim()) return;
    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      fishPopulation: Number(form.fishPopulation || "0"),
      biomassKg: Number(form.biomassKg || "0"),
      status: form.status,
    };
    if (editingId) {
      updateCage(editingId, payload);
    } else {
      createCage(payload);
    }
    setRows(listCages());
    resetForm();
  };

  const beginEdit = (row: Cage) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      location: row.location,
      fishPopulation: String(row.fishPopulation),
      biomassKg: String(row.biomassKg),
      status: row.status,
    });
  };

  return (
    <DashboardLayout title="Cage Management" subtitle="Create, view, edit, and delete cages.">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Cages</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.totalCages}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fish Population</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.totalFish}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Biomass (kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totals.totalBiomass.toLocaleString()}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Cage" : "Add Cage"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Fish Population</Label>
            <Input
              type="number"
              value={form.fishPopulation}
              onChange={(e) => setForm((f) => ({ ...f, fishPopulation: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Biomass (kg)</Label>
            <Input
              type="number"
              value={form.biomassKg}
              onChange={(e) => setForm((f) => ({ ...f, biomassKg: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Cage["status"] }))}
            >
              <option value="active">active</option>
              <option value="maintenance">maintenance</option>
            </select>
          </div>
          <div className="md:col-span-5 flex gap-2">
            <Button onClick={submit}>{editingId ? "Update Cage" : "Add Cage"}</Button>
            {editingId && (
              <Button variant="ghost" onClick={resetForm}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cage List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Fish</TableHead>
                <TableHead>Biomass</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.fishPopulation}</TableCell>
                  <TableCell>{row.biomassKg}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => beginEdit(row)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        deleteCage(row.id);
                        setRows(listCages());
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
