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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await navigate({ to: "/" });
    } catch {
      setError("We couldn't sign you in right now. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#041b2b] p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: `url("${cageBackgroundUrl}")` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[1] bg-gradient-to-br from-[#031725]/90 via-[#062c42]/75 to-[#031725]/90"
      />
      <div aria-hidden="true" className="aquasmart-fish-layer">
        <span className="aquasmart-fish aquasmart-fish-one" />
        <span className="aquasmart-fish aquasmart-fish-two" />
        <span className="aquasmart-fish aquasmart-fish-three" />
        <span className="aquasmart-fish aquasmart-fish-four" />
      </div>

      <style>{`
        @keyframes aquasmart-fish-swim {
          from { transform: translate3d(-12rem, 0, 0); }
          45% { transform: translate3d(48vw, -1rem, 0); }
          to { transform: translate3d(calc(100vw + 12rem), 1rem, 0); }
        }
        .aquasmart-fish-layer {
          position: absolute;
          inset: 0;
          z-index: 2;
          overflow: hidden;
          pointer-events: none;
        }
        .aquasmart-fish {
          position: absolute;
          left: 0;
          display: block;
          width: 5rem;
          height: 2.25rem;
          opacity: .25;
          background:
            radial-gradient(circle at 23% 42%, rgba(3, 23, 37, .95) 0 2px, transparent 2.5px),
            linear-gradient(180deg, rgba(125, 211, 252, .9), rgba(45, 212, 191, .82));
          clip-path: polygon(0 50%, 13% 25%, 48% 17%, 72% 32%, 100% 8%, 94% 50%, 100% 92%, 72% 68%, 48% 83%, 13% 75%);
          animation: aquasmart-fish-swim 32s linear infinite;
          filter: drop-shadow(0 3px 8px rgba(0, 0, 0, .2));
        }
        .aquasmart-fish-one {
          top: 58%;
          animation-duration: 34s;
        }
        .aquasmart-fish-two {
          top: 72%;
          width: 3.5rem;
          height: 1.6rem;
          animation-delay: -13s;
          animation-duration: 28s;
          opacity: .19;
        }
        .aquasmart-fish-three {
          top: 84%;
          width: 4.2rem;
          height: 1.8rem;
          animation-delay: -21s;
          animation-duration: 38s;
          opacity: .22;
        }
        .aquasmart-fish-four {
          top: 64%;
          width: 2.8rem;
          height: 1.25rem;
          animation-delay: -7s;
          animation-duration: 25s;
          opacity: .15;
        }
        @media (prefers-reduced-motion: reduce) {
          .aquasmart-fish { animation: none; left: 12%; }
          .aquasmart-fish-two { left: 55%; }
          .aquasmart-fish-three { left: 74%; }
          .aquasmart-fish-four { left: 36%; }
        }
      `}</style>

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
            Monitor your farm, track water quality, and make confident decisions for every stage of
            fish production.
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

        <Card className="w-full border border-white/20 bg-slate-950/75 text-white shadow-2xl shadow-black/30 backdrop-blur-xl">
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
                <p className="text-xs tracking-[0.18em] text-teal-200">SMART AQUACULTURE</p>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-white">Welcome back</CardTitle>
              <p className="mt-2 text-sm text-slate-300">
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
                <Label htmlFor="login-email" className="text-slate-200">
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
                  className="border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-teal-400"
                  placeholder="you@example.com"
                  disabled={isSubmitting}
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
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  className="border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-teal-400"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p role="alert" aria-live="polite" className="text-sm text-rose-300">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-teal-400 font-semibold text-slate-950 hover:bg-teal-300"
              >
                {isSubmitting ? "Signing in…" : "Log in"}
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
