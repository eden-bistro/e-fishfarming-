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
  const [hydrated, setHydrated] = useState(typeof window !== "undefined");
  const [session, setSession] = useState<ReturnType<typeof getSessionUser>>(() => getSessionUser());
  const navigate = useNavigate();

  useEffect(() => {
    setSession(getSessionUser());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (!session) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 py-8 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Login required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must register and sign in to access your dashboard.
          </p>
          <div className="mt-4 grid gap-2 sm:flex sm:justify-center">
            <Link to="/auth/register" className="rounded-md border px-4 py-2 text-sm">
              Register
            </Link>
            <Link
              to="/auth/login"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
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
