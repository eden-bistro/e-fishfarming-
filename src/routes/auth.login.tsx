import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { type FormEvent, useEffect, useState } from "react";
import { getSessionUser, loginUser } from "@/lib/auth";

export const Route = createFileRoute("/auth/login")({ component: Page });

function Page() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Keep signed-in users from landing back on the login screen after navigation or refresh.
    if (getSessionUser()) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      const result = await loginUser(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await navigate({ to: "/", replace: true });
    } catch {
      setError("We couldn't sign you in right now. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-8">
      <img
        src="/icons/Background.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-br from-slate-950/65 via-blue-950/45 to-cyan-950/55"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[2] overflow-hidden pointer-events-none"
      >
        <style>{`
          @keyframes aquasmart-fish-swim {
            0% { transform: translate3d(-18vw, 0, 0) scaleX(1); }
            48% { transform: translate3d(48vw, -14px, 0) scaleX(1); }
            50% { transform: translate3d(50vw, -14px, 0) scaleX(-1); }
            98% { transform: translate3d(118vw, 8px, 0) scaleX(-1); }
            100% { transform: translate3d(120vw, 8px, 0) scaleX(-1); }
          }
          .aquasmart-swimming-fish {
            position: absolute;
            left: 0;
            width: clamp(34px, 5vw, 68px);
            height: auto;
            fill: rgba(210, 246, 255, 0.68);
            filter: drop-shadow(0 2px 8px rgba(3, 25, 52, 0.25));
            animation: aquasmart-fish-swim 32s linear infinite;
            will-change: transform;
          }
          .aquasmart-swimming-fish--one { top: 28%; animation-duration: 34s; }
          .aquasmart-swimming-fish--two { top: 63%; animation-duration: 43s; animation-delay: -19s; width: clamp(24px, 3.5vw, 46px); opacity: .72; }
          .aquasmart-swimming-fish--three { top: 78%; animation-duration: 39s; animation-delay: -8s; width: clamp(28px, 4vw, 54px); opacity: .55; }
          @media (prefers-reduced-motion: reduce) {
            .aquasmart-swimming-fish { animation: none; opacity: .4; }
          }
        `}</style>
        <svg
          className="aquasmart-swimming-fish aquasmart-swimming-fish--one"
          viewBox="0 0 120 60"
          role="presentation"
        >
          <path d="M15 30C31 8 69 8 88 30C69 52 31 52 15 30ZM87 30L116 8L116 52Z" />
          <circle cx="31" cy="25" r="2.5" fill="rgba(3,25,52,.75)" />
        </svg>
        <svg
          className="aquasmart-swimming-fish aquasmart-swimming-fish--two"
          viewBox="0 0 120 60"
          role="presentation"
        >
          <path d="M15 30C31 8 69 8 88 30C69 52 31 52 15 30ZM87 30L116 8L116 52Z" />
          <circle cx="31" cy="25" r="2.5" fill="rgba(3,25,52,.75)" />
        </svg>
        <svg
          className="aquasmart-swimming-fish aquasmart-swimming-fish--three"
          viewBox="0 0 120 60"
          role="presentation"
        >
          <path d="M15 30C31 8 69 8 88 30C69 52 31 52 15 30ZM87 30L116 8L116 52Z" />
          <circle cx="31" cy="25" r="2.5" fill="rgba(3,25,52,.75)" />
        </svg>
      </div>

      <div className="relative z-10 grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden text-white lg:block">
          <div className="mb-8 flex items-center gap-4">
            <img
              src="/icons/Fish%20logo.png?v=2"
              alt="AquaSmart logo"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl shadow-lg shadow-black/20"
            />
            <div>
              <p className="text-3xl font-bold tracking-tight">AquaSmart</p>
              <p className="text-sm font-medium tracking-[0.22em] text-cyan-200">
                SMART AQUACULTURE
              </p>
            </div>
          </div>
          <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight">
            Better insights.
            <br />
            Healthier fish.
            <br />
            <span className="text-cyan-200">Smarter farming.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
            Monitor your farm, track water quality, and make confident decisions for every stage of
            fish production.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm text-white">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-white shadow-sm backdrop-blur">
              Water quality
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-white shadow-sm backdrop-blur">
              Feeding insights
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-white shadow-sm backdrop-blur">
              Farm management
            </span>
          </div>
        </section>

        <Card className="w-full border border-sky-100 bg-white/90 text-slate-900 shadow-2xl shadow-sky-900/10 backdrop-blur-xl">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex items-center gap-3 lg:hidden">
              <img
                src="/icons/Fish%20logo.png?v=2"
                alt="AquaSmart logo"
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl"
              />
              <div>
                <p className="text-xl font-bold tracking-tight">AquaSmart</p>
                <p className="text-xs tracking-[0.18em] text-teal-700">SMART AQUACULTURE</p>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-slate-900">Welcome back</CardTitle>
              <p className="mt-2 text-sm text-slate-600">
                Sign in to continue to your farm dashboard.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form
              className="space-y-5"
              onSubmit={(event) => void submit(event)}
              aria-busy={isSubmitting}
            >
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-slate-600">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  className="border-sky-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-slate-600">
                  Password
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  className="border-sky-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p role="alert" aria-live="polite" className="text-sm text-rose-600">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-fit min-w-32 px-8 bg-sky-700 font-semibold text-white hover:bg-sky-800"
              >
                {isSubmitting ? "Signing in…" : "Log in"}
              </Button>
            </form>
            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/auth/forgot-password"
                className="underline decoration-teal-400/70 underline-offset-4 hover:text-teal-700"
              >
                Forgot password?
              </Link>
              <p>
                No account?{" "}
                <Link
                  to="/auth/register"
                  className="font-medium text-teal-700 underline underline-offset-4 hover:text-teal-700"
                >
                  Register
                </Link>
              </p>
            </div>
            <p className="mt-8 border-t border-sky-100 pt-4 text-center text-xs text-slate-500">
              Aquaculture management, connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
