import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCurrentUserRecord, listUsers } from "@/lib/auth";
import { useState } from "react";

export const Route = createFileRoute("/settings/profile")({ component: Page });

function Page() {
  const current = getCurrentUserRecord();
  const [name, setName] = useState(current?.name ?? "");
  const [email, setEmail] = useState(current?.email ?? "");
  const [msg, setMsg] = useState("");

  function save() {
    if (!current) return;
    const users = listUsers();
    const ix = users.findIndex((u) => u.id === current.id);
    if (ix < 0) return;
    users[ix] = { ...users[ix], name: name.trim(), email: email.trim().toLowerCase() };
    localStorage.setItem("aquasmart_users", JSON.stringify(users));
    localStorage.setItem(
      "aquasmart_session",
      JSON.stringify({ id: current.id, name: name.trim(), email: email.trim().toLowerCase() }),
    );
    setMsg("Profile updated.");
  }

  return (
    <DashboardLayout title="Profile" subtitle="Edit your account profile.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <Button onClick={save}>Save Profile</Button>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </DashboardLayout>
  );
}
