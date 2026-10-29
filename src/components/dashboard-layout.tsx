import { ReactNode, useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { ChatWidget } from "@/components/ai/chat-widget";
import { getSessionUser } from "@/lib/auth";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function DashboardLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  // Begin with the same markup as the server and only read browser-backed auth after hydration.
  // This prevents SSR/client markup mismatches for users with a session stored in sessionStorage.
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<ReturnType<typeof getSessionUser>>(() => getSessionUser());
  const navigate = useNavigate();

  useEffect(() => {
    setSession(getSessionUser());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (!session) {
    return (
      <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 px-4 py-8 sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.35),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.25),transparent_48%)]"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 z-[1] h-80 w-80 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-28 -left-20 z-[1] h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
        />
        <div aria-hidden="true" className="absolute inset-0 z-[2] bg-blue-950/70" />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-sky-100/40 bg-white/95 p-6 text-center text-slate-900 shadow-2xl shadow-sky-900/20 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold">Login required</h1>
          <p className="mt-2 text-sm text-slate-600">
            You must register and sign in to access your dashboard.
          </p>
          <div className="mt-4 grid gap-2 sm:flex sm:justify-center">
            <Link
              to="/auth/register"
              className="rounded-md border border-sky-200 bg-white px-4 py-2 text-sm text-slate-900 transition-colors hover:bg-sky-50"
            >
              Register
            </Link>
            <Link
              to="/auth/login"
              className="rounded-md bg-sky-700 px-4 py-2 text-sm text-white transition-colors hover:bg-sky-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="aquasmart-dashboard-background">
        <TopNavbar />
        <main className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-3 py-4 pb-24 sm:px-4 md:gap-6 md:px-6 md:py-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.history.length > 1 ? window.history.back() : navigate({ to: "/" })
              }
              className="min-h-10 gap-2"
              aria-label="Go back to previous page"
            >
              <ArrowLeft className="h-4 w-4 icon-emphasis" /> Back
            </Button>
          </div>
          {(title || actions) && (
            <div className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                {title && (
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
        <ChatWidget />
      </SidebarInset>
    </SidebarProvider>
  );
}
