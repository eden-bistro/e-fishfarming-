import { Link, useRouterState } from "@tanstack/react-router";
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
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
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

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Feeding System": path.startsWith("/feeding"),
    "Water Quality": path.startsWith("/water"),
    Financial: path.startsWith("/finance"),
    Settings: path.startsWith("/settings"),
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
            <Fish className="h-5 w-5" />
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
                  <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                    <Link to={item.url as never}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
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
                    onClick={() => setOpenSections((prev) => ({ ...prev, [item.title]: !prev[item.title] }))}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isOpen && (
                  <div className="ml-7 mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
                    {item.children.map((child) => (
                      <SidebarMenuItem key={child.url}>
                        <SidebarMenuButton asChild isActive={path === child.url} tooltip={child.title}>
                          <Link to={child.url as never}>
                            <LineChart className="h-3.5 w-3.5 opacity-60" />
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
            <SidebarMenuButton tooltip="Log out">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
