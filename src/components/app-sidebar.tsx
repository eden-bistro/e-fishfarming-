import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  ChevronDown,
  Cpu,
  History,
  LineChart,
  LogOut,
  Package,
  ShieldCheck,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const closeSidebarAfterNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
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
        <div className="flex items-center gap-2 px-2 py-2">
          <img
            src="/icons/Fish%20logo.png?v=2"
            alt="AquaSmart fish logo"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
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
                    className="h-10 gap-2 px-2"
                  >
                    <Link to={item.url as never} onClick={closeSidebarAfterNavigation}>
                      {"iconImage" in item ? (
                        <img
                          src={item.iconImage}
                          alt=""
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0 rounded-md object-contain"
                        />
                      ) : (
                        <item.icon className="h-5 w-5 icon-emphasis" />
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
                      className="h-10 justify-center px-2"
                      aria-label={`${item.title} menu`}
                    >
                      <img
                        src={item.iconImage}
                        alt=""
                        aria-hidden="true"
                        className="h-6 w-6 shrink-0 rounded-md object-contain"
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
                            <CalendarClock className="h-5 w-5 icon-emphasis" />
                          ) : child.url === "/feeding/manual" ? (
                            <img
                              src="/icons/fish.jpg"
                              alt=""
                              aria-hidden="true"
                              className="h-5 w-5 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/feeding/history" ? (
                            <History className="h-5 w-5 icon-emphasis" />
                          ) : child.url === "/settings/devices" ? (
                            <img
                              src="/icons/IoT.png"
                              alt=""
                              aria-hidden="true"
                              className="h-5 w-5 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/finance/pnl" ? (
                            <img
                              src="/icons/profit.png"
                              alt=""
                              aria-hidden="true"
                              className="h-5 w-5 shrink-0 rounded-md object-contain"
                            />
                          ) : child.url === "/feeding/inventory" ? (
                            <Package className="h-5 w-5 icon-emphasis" />
                          ) : (
                            <LineChart className="h-5 w-5 icon-emphasis" />
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

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Open account menu"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src="/icons/user.jpg" alt="" />
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
                closeSidebarAfterNavigation();
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
