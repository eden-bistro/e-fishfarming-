import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNavbar } from "@/components/top-navbar";
import { ChatWidget } from "@/components/ai/chat-widget";
import { getSessionUser } from "@/lib/auth";
import { Link } from "@tanstack/react-router";
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
  const session = getSessionUser();

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Login required</h1>
          <p className="mt-2 text-sm text-muted-foreground">You must register and sign in to access your dashboard.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/auth/register" className="rounded-md border px-4 py-2 text-sm">Register</Link>
            <Link to="/auth/login" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Sign in</Link>
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
        <main className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          <div>
            <Button variant="outline" size="sm" onClick={() => window.history.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
          {(title || actions) && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                {title && (
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
        <ChatWidget />
      </SidebarInset>
    </SidebarProvider>
  );
}
