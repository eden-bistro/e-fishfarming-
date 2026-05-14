import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Fish,
  CalendarClock,
  Hand,
  History,
  Package,
  Droplets,
  Activity,
  LineChart,
  BellRing,
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileBarChart,
  Settings,
  Users,
  Cpu,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  {
    label: null,
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Feeding System",
    items: [
      { title: "Feeding Schedule", url: "/feeding/schedule", icon: CalendarClock },
      { title: "Manual Feeding", url: "/feeding/manual", icon: Hand },
      { title: "Feeding History", url: "/feeding/history", icon: History },
      { title: "Feed Inventory", url: "/feeding/inventory", icon: Package },
    ],
  },
  {
    label: "Water Quality",
    items: [
      { title: "Live Monitoring", url: "/water/live", icon: Activity },
      { title: "Water History", url: "/water/history", icon: LineChart },
      { title: "Alerts", url: "/water/alerts", icon: BellRing },
    ],
  },
  {
    label: "Financial",
    items: [
      { title: "Income", url: "/finance/income", icon: TrendingUp },
      { title: "Expenses", url: "/finance/expenses", icon: TrendingDown },
      { title: "Profit & Loss", url: "/finance/pnl", icon: PieChart },
      { title: "Reports", url: "/finance/reports", icon: FileBarChart },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Farm Settings", url: "/settings/farm", icon: Settings },
      { title: "Users & Roles", url: "/settings/users", icon: Users },
      { title: "Devices", url: "/settings/devices", icon: Cpu },
    ],
  },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
            <Fish className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-base font-semibold tracking-tight">AquaSmart</span>
            <span className="text-[11px] text-sidebar-foreground/60">
              Smart Fish Farm
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g, i) => (
          <SidebarGroup key={i}>
            {g.label && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = path === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url as never}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
