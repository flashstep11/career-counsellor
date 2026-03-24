"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  GraduationCap,
  Sparkles,
  Video,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
  Calendar,
  Network,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  matchPrefix?: string;
}

const staticNavItems: NavItem[] = [
  {
    title: "Discussion",
    href: "/forums",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    title: "Blogs",
    href: "/blogs",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Videos",
    href: "/videos",
    icon: <Video className="h-5 w-5" />,
  },
  {
    title: "Experts",
    href: "/experts",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    title: "Colleges",
    href: "/colleges",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Career Predictor",
    href: "/assessments",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: <Calendar className="h-5 w-5" />,
  },
];

function NavLink({
  item,
  isCollapsed,
  active,
}: {
  item: NavItem;
  isCollapsed: boolean;
  active: boolean;
}) {
  const linkEl = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center rounded-lg transition-colors group w-full",
        isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 transition-colors",
          active
            ? "text-blue-700"
            : "text-gray-500 group-hover:text-gray-700"
        )}
      >
        {item.icon}
      </span>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.title}</span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkEl;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const isActive = (item: NavItem) => {
    if (item.matchPrefix === "__exact__") return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const isDashboardActive =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin");

  return (
    <TooltipProvider delayDuration={0}>
      {/* ─── Desktop Sidebar ─────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-30 pt-[80px] overflow-visible transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Collapse / Expand toggle button */}
        <button
          onClick={() => setIsCollapsed((prev: boolean) => !prev)}
          className="absolute -right-3 top-[96px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="h-5 w-5" strokeWidth={3} />
          ) : (
            <ChevronsLeft className="h-5 w-5" strokeWidth={3} />
          )}
        </button>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          <div className="space-y-1">
            {staticNavItems.map((item) => (
              <NavLink
                key={item.title}
                item={item}
                isCollapsed={isCollapsed}
                active={isActive(item)}
              />
            ))}

            {isAuthenticated && (
              <NavLink
                item={{
                  title: "My Network",
                  href: "/network",
                  icon: <Network className="h-5 w-5" />,
                }}
                isCollapsed={isCollapsed}
                active={pathname === "/network"}
              />
            )}

            {isAuthenticated && (
              <NavLink
                item={{
                  title: "Dashboard",
                  href: "/dashboard",
                  icon: <LayoutDashboard className="h-5 w-5" />,
                }}
                isCollapsed={isCollapsed}
                active={isDashboardActive}
              />
            )}

            {isAuthenticated && user?.isExpert && user?.expertId && (
              <NavLink
                item={{
                  title: "Expert Dashboard",
                  href: `/experts/${user.expertId}`,
                  icon: <GraduationCap className="h-5 w-5" />,
                }}
                isCollapsed={isCollapsed}
                active={pathname === `/experts/${user.expertId}`}
              />
            )}
          </div>
        </nav>

        {!isCollapsed && (
          <div className="px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">© 2026 AlumNiti</p>
          </div>
        )}
      </aside>

      {/* ─── Mobile Sidebar ───────────────────────────────────────────── */}
      <MobileSidebar pathname={pathname} isAuthenticated={isAuthenticated} />
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Lightweight mobile-only sidebar (off-canvas drawer)                 */
/* ------------------------------------------------------------------ */
function MobileSidebar({
  pathname,
  isAuthenticated,
}: {
  pathname: string;
  isAuthenticated: boolean;
}) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { user } = useAuth();

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  // On mobile "isCollapsed" acts as "drawer is closed"
  const isOpen = !isCollapsed;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 z-50 pt-[80px] flex flex-col md:hidden transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            {staticNavItems.map((item) => {
              const active =
                item.matchPrefix === "__exact__"
                  ? isActive(item.href, true)
                  : isActive(item.href);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  onClick={() => setIsCollapsed(true)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <span className={active ? "text-blue-700" : "text-gray-500"}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.title}</span>
                </Link>
              );
            })}

            {isAuthenticated && (
              <Link
                href="/network"
                onClick={() => setIsCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  pathname === "/network"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className={pathname === "/network" ? "text-blue-700" : "text-gray-500"}>
                  <Network className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">My Network</span>
              </Link>
            )}

            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setIsCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/admin")
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span
                  className={
                    pathname.startsWith("/dashboard") ||
                      pathname.startsWith("/admin")
                      ? "text-blue-700"
                      : "text-gray-500"
                  }
                >
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
            )}

            {isAuthenticated && user?.isExpert && user?.expertId && (
              <Link
                href={`/experts/${user.expertId}`}
                onClick={() => setIsCollapsed(true)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  pathname === `/experts/${user.expertId}`
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span
                  className={
                    pathname === `/experts/${user.expertId}`
                      ? "text-blue-700"
                      : "text-gray-500"
                  }
                >
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">Expert Dashboard</span>
              </Link>
            )}
          </div>
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">© 2026 AlumNiti</p>
        </div>
      </aside>
    </>
  );
}
