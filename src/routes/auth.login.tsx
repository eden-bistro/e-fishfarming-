import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { type FormEvent, useState } from "react";
import { loginUser } from "@/lib/auth";

export const Route = createFileRoute("/auth/login")({ component: Page });

function Page() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await loginUser(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate({ to: "/" });
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#041b2b] p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1530053969600-caed2596d242?auto=format&fit=crop&w=2400&q=85')",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[#031725]/90 via-[#062c42]/75 to-[#031725]/90"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 20% 20%, rgba(45,212,191,.32), transparent 35%), radial-gradient(ellipse at 85% 80%, rgba(56,189,248,.24), transparent 38%)",
        }}
      />

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden text-white lg:block">
          <div className="mb-8 flex items-center gap-4">
            <img
              src="/icons/aquasmart-icon.svg"
              alt="AquaSmart logo"
              className="h-16 w-16 rounded-2xl shadow-lg shadow-black/20"
            />
            <div>
              <p className="text-3xl font-bold tracking-tight">AquaSmart</p>
              <p className="text-sm font-medium tracking-[0.22em] text-teal-200">
                SMART AQUACULTURE
              </p>
            </div>
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight">
            Better insights.
            <br />
            Healthier fish.
            <br />
            <span className="text-teal-300">Smarter farming.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-200">
            Monitor your farm, track water quality, and make confident decisions
            for every stage of fish production.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm text-slate-100">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
              Water quality
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
              Feeding insights
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
              Farm management
            </span>
          </div>
        </section>

        <Card className="w-full border border-white/20 bg-slate-950/65 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src="/icons/aquasmart-icon.svg"
                alt="AquaSmart logo"
                className="h-12 w-12 rounded-xl"
              />
              <div>
                <p className="text-xl font-bold tracking-tight">AquaSmart</p>
                <p className="text-xs tracking-[0.18em] text-teal-200">
                  SMART AQUACULTURE
                </p>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-white">
                Welcome back
              </CardTitle>
              <p className="mt-2 text-sm text-slate-300">
                Sign in to continue to your farm dashboard.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form className="space-y-5" onSubmit={(event) => void submit(event)}>
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-200">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-teal-400"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-200">
                  Password
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-teal-400"
                  placeholder="Enter your password"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-rose-300">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full bg-teal-400 font-semibold text-slate-950 hover:bg-teal-300"
              >
                Log in
              </Button>
            </form>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/auth/forgot-password"
                className="underline decoration-teal-400/70 underline-offset-4 hover:text-teal-200"
              >
                Forgot password?
              </Link>
              <p>
                No account?{" "}
                <Link
                  to="/auth/register"
                  className="font-medium text-teal-300 underline underline-offset-4 hover:text-teal-200"
                >
                  Register
                </Link>
              </p>
            </div>
            <p className="mt-8 border-t border-white/10 pt-4 text-center text-xs text-slate-400">
              Aquaculture management, connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
