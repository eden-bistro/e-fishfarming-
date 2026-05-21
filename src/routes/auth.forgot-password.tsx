import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { forgotPassword } from "@/lib/auth";

export const Route = createFileRoute("/auth/forgot-password")({ component: Page });

function Page() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const result = await forgotPassword(email);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setMessage("If this email exists, a recovery email has been sent.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Button className="w-full" onClick={() => void submit()}>
            Send recovery email
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link to="/auth/login" className="text-primary underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
