import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Cpu,
  Droplets,
  Fish,
  LayoutDashboard,
  LineChart,
  LogOut,
  ShieldCheck,
  Settings,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUserRecord, getSessionUser, logoutUser } from "@/lib/auth";
import { isAdminUser } from "@/contexts/rbac";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Production",
    icon: Fish,
    children: [
      { title: "Production", url: "/production" },
      { title: "Inventory", url: "/inventory" },
    ],
  },
  {
    title: "Cage Management",
    icon: Cpu,
    children: [{ title: "Cage Management", url: "/cages" }],
  },
  { title: "AI Insights", url: "/ai/insights", icon: Cpu },
  {
    title: "Admin",
    url: "/admin/dashboard",
    icon: ShieldCheck,
    adminOnly: true,
  },
  {
    title: "Feeding System",
    icon: Fish,
    children: [
      { title: "Feeding Schedule", url: "/feeding/schedule" },
      { title: "Manual Feeding", url: "/feeding/manual" },
      { title: "Feeding History", url: "/feeding/history" },
      { title: "Feed Inventory", url: "/feeding/inventory" },
    ],
  },
  {
    title: "Water Quality",
    icon: Droplets,
    children: [
      { title: "Live Monitoring", url: "/water/live" },
      { title: "Water History", url: "/water/history" },
      { title: "Alerts", url: "/water/alerts" },
    ],
  },
  {
    title: "Financial",
    icon: Wallet,
    children: [
      { title: "Income", url: "/finance/income" },
      { title: "Expenses", url: "/finance/expenses" },
      { title: "Profit & Loss", url: "/finance/pnl" },
      { title: "Reports", url: "/finance/reports" },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    children: [
      { title: "Farm Settings", url: "/settings/farm" },
      { title: "Users & Roles", url: "/settings/users-and-roles" },
      { title: "Devices", url: "/settings/devices" },
    ],
  },
] as const;

function displayNameForUser(name?: string, email?: string) {
  const preferredName = name?.trim();
  if (preferredName && preferredName.toLowerCase() !== email?.trim().toLowerCase()) {
    return preferredName;
  }

  return email?.split("@")[0] || "User";
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Production: path.startsWith("/production") || path.startsWith("/inventory"),
    "Cage Management": path.startsWith("/cages"),
    "Feeding System": path.startsWith("/feeding"),
    "Water Quality": path.startsWith("/water"),
    Financial: path.startsWith("/finance"),
    Settings: path.startsWith("/settings"),
  });

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  const canSeeAdmin = isAdminUser();
  const session = getSessionUser();
  const currentUser = getCurrentUserRecord();
  const displayName = displayNameForUser(session?.name ?? currentUser?.name, session?.email);
  const accountRole = session?.role === "admin" ? "Admin" : "User";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
            <Fish className="h-5 w-5 icon-emphasis" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight">AquaSmart</span>
            <span className="text-[11px] text-sidebar-foreground/60">Smart Fish Farm</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            if ("adminOnly" in item && item.adminOnly && !canSeeAdmin) return null;
            if (!("children" in item)) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    size="default"
                    isActive={path === item.url}
                    tooltip={item.title}
                    className="h-10 gap-3 px-3"
                  >
                    <Link to={item.url as never} onClick={closeMobileSidebar}>
                      <item.icon className="h-4 w-4 icon-emphasis" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            const isOpen = Boolean(openSections[item.title]);
            return (
              <div key={item.title} className="mb-1">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.title}
                    size="default"
                    className="h-10 gap-3 px-3"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenSections((prev) => ({ ...prev, [item.title]: !prev[item.title] }))
                    }
                  >
                    <item.icon className="h-4 w-4 icon-emphasis" />
                    <span className="truncate">{item.title}</span>
                    <ChevronDown
                      className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isOpen && (
                  <div className="ml-10 mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
                    {item.children.map((child) => (
                      <SidebarMenuItem key={child.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={path === child.url}
                          tooltip={child.title}
                          className="h-9 px-2"
                        >
                          <Link to={child.url as never} onClick={closeMobileSidebar}>
                            <LineChart className="h-3.5 w-3.5 opacity-80 icon-emphasis" />
                            <span>{child.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block truncate text-sm font-medium">{displayName}</span>
                <span className="block text-xs text-sidebar-foreground/60">{accountRole}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
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
                closeMobileSidebar();
                navigate({ to: "/auth/login" });
              }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
