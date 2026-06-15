import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Cpu,
  Droplets,
  Fish,
  LayoutDashboard,
  LineChart,
  LogOut,
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
import { logoutUser } from "@/lib/auth";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Daily farm overview",
  },
  {
    title: "Production Module",
    icon: Fish,
    description: "Growth, harvests and stock",
    children: [
      { title: "Production", url: "/production" },
      { title: "Inventory", url: "/inventory" },
    ],
  },
  {
    title: "Cage & Hatchery",
    icon: Cpu,
    description: "Cages, ponds and fingerlings",
    children: [
      { title: "Cage Management", url: "/cages" },
      { title: "Hatchery", url: "/hatchery" },
    ],
  },
  { title: "AI Insights", url: "/ai/insights", icon: Cpu, description: "Smart recommendations" },
  {
    title: "Feeding System",
    icon: Fish,
    description: "Schedules and feeding records",
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
    description: "Live water health and alerts",
    children: [
      { title: "Live Monitoring", url: "/water/live" },
      { title: "Water History", url: "/water/history" },
      { title: "Alerts", url: "/water/alerts" },
    ],
  },
  {
    title: "Financial",
    icon: Wallet,
    description: "Income, expenses and reports",
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
    description: "Users, farm and devices",
    children: [
      { title: "Farm Settings", url: "/settings/farm" },
      { title: "Users & Roles", url: "/settings/users-and-roles" },
      { title: "Devices", url: "/settings/devices" },
    ],
  },
] as const;

export function AppSidebar() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpenMobile } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Production Module": path.startsWith("/production") || path.startsWith("/inventory"),
    "Cage & Hatchery": path.startsWith("/cages") || path.startsWith("/hatchery"),
    "Feeding System": path.startsWith("/feeding"),
    "Water Quality": path.startsWith("/water"),
    Financial: path.startsWith("/finance"),
    Settings: path.startsWith("/settings"),
  });

  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
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
            if (!("children" in item)) {
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={path === item.url}
                    tooltip={item.title}
                    className="min-h-12"
                  >
                    <Link to={item.url as never} onClick={closeMobileSidebar}>
                      <item.icon className="h-4 w-4 icon-emphasis" />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate">{item.title}</span>
                        <span className="truncate text-[11px] font-normal text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                          {item.description}
                        </span>
                      </span>
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
                    size="lg"
                    className="min-h-12"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setOpenSections((prev) => ({ ...prev, [item.title]: !prev[item.title] }))
                    }
                  >
                    <item.icon className="h-4 w-4 icon-emphasis" />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate">{item.title}</span>
                      <span className="truncate text-[11px] font-normal text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                        {item.description}
                      </span>
                    </span>
                    <ChevronDown
                      className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isOpen && (
                  <div className="ml-7 mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
                    {item.children.map((child) => (
                      <SidebarMenuItem key={child.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={path === child.url}
                          tooltip={child.title}
                          className="min-h-10"
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              className="min-h-10"
              onClick={() => {
                logoutUser();
                closeMobileSidebar();
                navigate({ to: "/auth/login" });
              }}
            >
              <LogOut className="h-4 w-4 icon-emphasis" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
