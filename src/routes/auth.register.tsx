import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { registerUser } from "@/lib/auth";
import { getMissingSupabaseConfigKeys } from "@/supabase/client";

export const Route = createFileRoute("/auth/register")({ component: Page });

function Page() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const missingConfig = getMissingSupabaseConfigKeys();
  const configError =
    missingConfig.length > 0
      ? `Missing config: ${missingConfig.join(", ")}. Set these in your Cloudflare env vars, then redeploy.`
      : "";

  async function submit() {
    if (configError) {
      setError(configError);
      return;
    }

    const result = await registerUser(name, email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {(configError || error) && (
            <p className="text-sm text-destructive">{configError || error}</p>
          )}
          <Button className="w-full" onClick={() => void submit()}>
            Register
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
