import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

type Role = "Owner" | "Manager" | "Operator" | "Accountant";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

const initialUsers: UserRow[] = [
  { id: 1, name: "John Doe", email: "john@aquasmart.ke", role: "Owner" },
  { id: 2, name: "Mary Achieng", email: "mary@aquasmart.ke", role: "Manager" },
  { id: 3, name: "Peter Otieno", email: "peter@aquasmart.ke", role: "Operator" },
  { id: 4, name: "Grace Wanjiru", email: "grace@aquasmart.ke", role: "Accountant" },
];

const roles: Role[] = ["Owner", "Manager", "Operator", "Accountant"];

export const Route = createFileRoute("/settings/users-and-roles")({
  head: () => ({ meta: [{ title: "Users & Roles — AquaSmart" }] }),
  component: Page,
});

function Page() {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Operator" as Role });

  const isEditing = editingId !== null;

  const summary = useMemo(() => {
    return roles.map((role) => ({ role, count: users.filter((u) => u.role === role).length }));
  }, [users]);

  function resetForm() {
    setEditingId(null);
    setForm({ name: "", email: "", role: "Operator" });
  }

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setForm({ name: user.name, email: user.email, role: user.role });
  }

  function submitForm() {
    if (!form.name.trim() || !form.email.trim()) return;

    if (editingId !== null) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId ? { ...u, name: form.name.trim(), email: form.email.trim(), role: form.role } : u,
        ),
      );
      resetForm();
      return;
    }

    const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    setUsers((prev) => [...prev, { id: nextId, name: form.name.trim(), email: form.email.trim(), role: form.role }]);
    resetForm();
  }

  function deleteUser(id: number) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (editingId === id) resetForm();
  }

  return (
    <DashboardLayout title="Users & Roles" subtitle="Manage team members, roles, and access permissions.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map((item) => (
            <div key={item.role} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{item.role}</p>
              <p className="text-xl font-semibold">{item.count}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isEditing ? "Edit User" : "Add User"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Role</Label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <Button className="gap-1" onClick={submitForm}>
              <Plus className="h-4 w-4" />
              {isEditing ? "Update User" : "Add User"}
            </Button>
            {isEditing && (
              <Button variant="ghost" onClick={resetForm}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User List</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <Avatar>
                <AvatarFallback className="bg-brand text-brand-foreground text-xs">
                  {u.name.split(" ").map((s) => s[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="secondary">{u.role}</Badge>
              <Button variant="outline" size="sm" onClick={() => startEdit(u)}>
                <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
