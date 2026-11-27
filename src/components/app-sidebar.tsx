import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  Cpu,
  History,
  LineChart,
  Package,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAdminUser } from "@/contexts/rbac";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    iconImage: "/icons/dashboard.png",
  },
  {
    title: "Production",
    iconImage: "/icons/fish.jpg",
    children: [
      { title: "Production", url: "/production" },
      { title: "Inventory", url: "/inventory" },
    ],
  },
  {
    title: "Cage Management",
    iconImage: "/icons/cage.jpg",
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
    iconImage: "/icons/fish.jpg",
    children: [
      { title: "Feeding Schedule", url: "/feeding/schedule" },
      { title: "Manual Feeding", url: "/feeding/manual" },
      { title: "Feeding History", url: "/feeding/history" },
      { title: "Feed Inventory", url: "/feeding/inventory" },
    ],
  },
  {
    title: "Water Quality",
    iconImage: "/icons/Water.png",
    children: [
      { title: "Live Monitoring", url: "/water/live" },
      { title: "Water History", url: "/water/history" },
      { title: "Alerts", url: "/water/alerts" },
    ],
  },
  {
    title: "Financial",
    iconImage: "/icons/Financial.png",
    children: [
      { title: "Income", url: "/finance/income" },
      { title: "Expenses", url: "/finance/expenses" },
      { title: "Profit & Loss", url: "/finance/pnl" },
      { title: "Reports", url: "/finance/reports" },
    ],
  },
  {
    title: "Settings",
    iconImage: "/icons/settings.png",
    children: [
      { title: "Farm Settings", url: "/settings/farm" },
      { title: "Users & Roles", url: "/settings/users-and-roles" },
      { title: "Devices", url: "/settings/devices" },
    ],
  },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const closeSidebarAfterNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const canSeeAdmin = isAdminUser();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-col items-center justify-center gap-2 px-2 py-3">
          <img
            src="/icons/Fish%20logo.png?v=2"
            alt="AquaSmart fish logo"
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-xl object-contain"
          />
          <div className="flex flex-col items-center text-center leading-tight group-data-[collapsible=icon]:hidden">
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
                    className="h-12 gap-2 px-2"
                  >
                    <Link to={item.url as never} onClick={closeSidebarAfterNavigation}>
                      {"iconImage" in item ? (
                        <img
                          src={item.iconImage}
                          alt=""
                          aria-hidden="true"
                          className="h-7 w-7 shrink-0 rounded-md object-contain"
                        />
                      ) : (
                        <item.icon className="h-6 w-6 icon-emphasis" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            const hasActiveChild = item.children.some((child) => path === child.url);
            return (
              <SidebarMenuItem key={item.title}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      size="default"
                      isActive={hasActiveChild}
                      className="h-12 justify-center px-2"
                      aria-label={`${item.title} menu`}
                    >
                      <img
                        src={item.iconImage}
                        alt=""
                        aria-hidden="true"
                        className="h-7 w-7 shrink-0 rounded-md object-contain"
                      />
                      <span className="truncate group-data-[collapsible=icon]:sr-only">
                        {item.title}
                      </span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="min-w-48">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.url} asChild>
                        <Link
                          to={child.url as never}
                          onClick={closeSidebarAfterNavigation}
                          className="flex w-full items-center gap-2"
                        >
                          {child.url === "/feeding/schedule" ? (
                            <CalendarClock className="h-6 w-6 icon-emphasis" />
                          ) : child.url === "/feeding/manual" ? (
                            <img
                              src="/icons/fish.jpg"
                              alt=""
                              aria-hidden="true"
                              className="h-6 w-6 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/feeding/history" ? (
                            <History className="h-6 w-6 icon-emphasis" />
                          ) : child.url === "/settings/devices" ? (
                            <img
                              src="/icons/IoT.png"
                              alt=""
                              aria-hidden="true"
                              className="h-6 w-6 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/finance/pnl" ? (
                            <img
                              src="/icons/profit.png"
                              alt=""
                              aria-hidden="true"
                              className="h-6 w-6 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/feeding/inventory" ? (
                            <Package className="h-6 w-6 icon-emphasis" />
                          ) : (
                            <LineChart className="h-6 w-6 icon-emphasis" />
                          )}
                          <span>{child.title}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
