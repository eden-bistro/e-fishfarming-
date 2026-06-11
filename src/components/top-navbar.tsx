import { useEffect, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { getSessionUser, logoutUser } from "@/lib/auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PAGE_TITLES: Array<[string, string]> = [
  ["/settings/devices", "Devices"],
  ["/settings/users-and-roles", "Users & Roles"],
  ["/settings/preferences", "Preferences"],
  ["/settings/profile", "Profile"],
  ["/settings/farm", "Farm Settings"],
  ["/feeding/schedule", "Feeding Schedule"],
  ["/feeding/manual", "Manual Feeding"],
  ["/feeding/history", "Feeding History"],
  ["/feeding/inventory", "Feed Inventory"],
  ["/water/live", "Live Water"],
  ["/water/history", "Water History"],
  ["/water/alerts", "Water Alerts"],
  ["/finance/income", "Income"],
  ["/finance/expenses", "Expenses"],
  ["/finance/pnl", "Profit & Loss"],
  ["/finance/reports", "Finance Reports"],
  ["/ai/insights", "AI Insights"],
  ["/production", "Production"],
  ["/inventory", "Inventory"],
  ["/hatchery", "Hatchery"],
  ["/cages", "Cages"],
  ["/reports", "Reports"],
  ["/", "Dashboard"],
];

function titleForPath(pathname: string): string {
  return (
    PAGE_TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ??
    "Dashboard"
  );
}

export function TopNavbar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const session = getSessionUser();
  const [today, setToday] = useState("Today");
  const pageTitle = titleForPath(pathname);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-KE", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b bg-background/90 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:gap-3 md:px-6">
      <SidebarTrigger className="icon-pill shrink-0 md:-ml-1" aria-label="Open navigation menu" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">{pageTitle}</h1>
        <p className="truncate text-xs text-muted-foreground">
          Welcome back, {session?.name ?? "User"}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 md:inline-flex">
              <Calendar className="icon-emphasis h-4 w-4" />
              {today}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Today</DropdownMenuItem>
            <DropdownMenuItem>Last 7 days</DropdownMenuItem>
            <DropdownMenuItem>Last 30 days</DropdownMenuItem>
            <DropdownMenuItem>This year</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 md:inline-flex">
              My Farm
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Switch farm</DropdownMenuLabel>
            <DropdownMenuItem>My Farm</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex min-h-10 items-center gap-2 rounded-md p-1 pl-1 pr-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open account menu"
            >
              <Avatar className="h-9 w-9 md:h-8 md:w-8">
                <AvatarFallback className="bg-brand text-xs text-brand-foreground">
                  {(session?.name ?? "U")
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden max-w-44 text-left md:block">
                <div className="truncate text-sm font-medium leading-tight">
                  {session?.name ?? "User"}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {session?.email ?? ""}
                </div>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings/profile" })}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/settings/preferences" })}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logoutUser();
                navigate({ to: "/auth/login" });
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
