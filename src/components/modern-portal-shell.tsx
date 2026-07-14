"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useRef, createContext, useContext } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Settings,
  Bell,
  Search,
  Menu,
  LogOut,
  X,
  Megaphone,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  School,
  BookMarked,
  UsersRound,
  ArrowRightLeft,
  FileText,
  ClipboardList,
  Palette,
  LayoutTemplate,
  Database,
  Award,
  CreditCard,
  Receipt,
  Headset,
  UserCog,
  Phone,
  Mail,
  HelpCircle,
  Activity,
  BarChart3,
  Shield,
  User,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveSessionProvider, useActiveSession } from "@/components/active-session-provider";
import { signOut } from "next-auth/react";
import { navByRole, type NavItem as RoleNavItem } from "@/lib/navigation";

type Notification = {
  id: string;
  recordId?: number;
  type: "announcement" | "message" | "complaint" | "contest" | "invoice" | "result" | "attendance" | "admission" | "fee_reminder" | "general";
  title: string;
  description: string;
  audience: string;
  createdAt: string;
  link?: string;
  isRead?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  children?: NavItem[];
};

const IsInsideShell = createContext(false);

function getNavItems(role: string): NavItem[] {
  const items = navByRole[role] ?? [];
  return items.map((item: RoleNavItem) => ({
    label: item.label,
    href: item.href,
    icon: item.icon as React.ComponentType<{ className?: string }>,
    group: item.group,
    children: item.children?.map((child) => ({
      label: child.label,
      href: child.href,
      icon: child.icon as React.ComponentType<{ className?: string }>,
    })),
  }));
}

export function ModernPortalShell({
  role,
  schoolName,
  schoolLogoUrl,
  userName,
  avatarUrl,
  primaryColor,
  secondaryColor,
  pathname: pathnameProp,
  children,
}: {
  role: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  userName: string;
  avatarUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  pathname?: string;
  children: React.ReactNode;
}) {
  const isNested = useContext(IsInsideShell);
  const currentPathname = usePathname() ?? "";
  const pathname = pathnameProp ?? currentPathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["/admin/classes"]);
  const displaySchoolName = schoolName?.trim() || "School";

  const schoolInitials = useMemo(() =>
    displaySchoolName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(""),
    [displaySchoolName]
  );

  // Fetch notifications from both persistent records and legacy API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [recordsRes, legacyRes] = await Promise.all([
          fetch("/api/notifications/records", { cache: "no-store" }),
          fetch("/api/notifications/latest", { cache: "no-store" }),
        ]);
        const recordsData = recordsRes.ok ? await recordsRes.json() : { notifications: [] };
        const legacyData = legacyRes.ok ? await legacyRes.json() : { notifications: [] };
        const recordNotifs = recordsData.notifications || [];
        const legacyNotifs = legacyData.notifications || [];
        const seenIds = new Set(recordNotifs.map((n: Notification) => n.id));
        const merged = [...recordNotifs, ...legacyNotifs.filter((n: Notification) => !seenIds.has(n.id))];
        setNotifications(merged);
      } catch {
        // Silently fail
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const hasUnread = unreadNotifications.length > 0;

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // If already inside a shell, just render children (prevents double shells from nested pages)
  if (isNested) {
    return <>{children}</>;
  }

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isExpanded = (href: string) => expandedMenus.includes(href);

  return (
    <ActiveSessionProvider>
    <IsInsideShell.Provider value={true}>
    <div
      className="min-h-screen bg-slate-50"
      style={
        {
          "--brand-primary": primaryColor ?? "#0B1F4D",
          "--brand-secondary": secondaryColor ?? "#0E9F6E",
        } as React.CSSProperties
      }
    >
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Notifications Overlay */}
      {notificationsOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setNotificationsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo Section */}
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 px-4">
          {schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolLogoUrl}
              alt={`${displaySchoolName} logo`}
              className="h-10 w-10 rounded-lg object-contain"
              onError={(e) => { console.error("[ModernPortalShell] logo failed to load:", schoolLogoUrl, e); }}
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-semibold"
              style={{ backgroundColor: primaryColor ?? "#0B1F4D" }}
            >
              {schoolInitials || "SS"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{displaySchoolName}</p>
            <p className="text-xs text-slate-500">{role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {(() => {
            const items = getNavItems(role);
            const groups: { label: string | null; items: NavItem[] }[] = [];
            const groupMap = new Map<string | null, NavItem[]>();
            for (const item of items) {
              const g = item.group ?? null;
              if (!groupMap.has(g)) groupMap.set(g, []);
              groupMap.get(g)!.push(item);
            }
            for (const [label, groupItems] of groupMap) {
              groups.push({ label, items: groupItems });
            }

            return groups.map((group, gi) => (
              <div key={gi} className="space-y-1">
                {group.label ? (
                  <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group.label.replace(/^\d+\.\s*/, "")}
                  </div>
                ) : null}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const hasChildren = item.children && item.children.length > 0;
                  const expanded = isExpanded(item.href);

                  return (
                    <div key={item.href} className="space-y-1">
                      {hasChildren ? (
                        <>
                          <button
                            onClick={() => toggleMenu(item.href)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive
                                ? "text-[var(--brand-primary)]"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                            style={isActive ? { backgroundColor: `${primaryColor ?? "#0B1F4D"}15` } : undefined}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={cn("h-5 w-5", isActive ? "text-[var(--brand-primary)]" : "text-slate-400")} />
                              {item.label}
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                expanded ? "rotate-180" : "",
                                isActive ? "text-[var(--brand-primary)]" : "text-slate-400"
                              )}
                            />
                          </button>
                          {expanded && item.children && (
                            <div className="ml-2 mt-1 space-y-0.5">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = pathname === child.href;
                                return (
                                  <Link
                                    key={`${child.href}-${child.label}`}
                                    href={child.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={cn(
                                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                      isChildActive
                                        ? "text-[var(--brand-primary)] font-medium"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                    style={isChildActive ? { backgroundColor: `${primaryColor ?? "#0B1F4D"}15` } : undefined}
                                  >
                                    <ChildIcon className={cn("h-4 w-4", isChildActive ? "text-[var(--brand-primary)]" : "text-slate-400")} />
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "text-[var(--brand-primary)]"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                          style={isActive ? { backgroundColor: `${primaryColor ?? "#0B1F4D"}15` } : undefined}
                        >
                          <Icon className={cn("h-5 w-5", isActive ? "text-[var(--brand-primary)]" : "text-slate-400")} />
                          {item.label}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </nav>

        {/* Sign Out */}
        <div className="flex-shrink-0 border-t border-slate-200 p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-5 w-5 text-slate-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Mobile Menu & Search */}
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden px-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="relative max-w-md flex-1 hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Search..."
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Right: Notifications & User Profile */}
            <div className="flex items-center gap-3">
              {/* Notification Bell with Dropdown */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative px-2"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                >
                  <Bell className="h-5 w-5 text-slate-600" />
                  {hasUnread && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </Button>
                
                {/* Notification Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <h3 className="font-semibold text-slate-900">Notifications</h3>
                      {hasUnread && (
                        <span className="text-xs font-medium text-indigo-600">
                          {unreadNotifications.length} new
                        </span>
                      )}
                      <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {unreadNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <div className="mx-auto mb-3 rounded-full bg-slate-100 p-3 w-fit">
                            <Bell className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500">No unread notifications</p>
                        </div>
                      ) : (
                        unreadNotifications.map((notif) => {
                          const Icon = notif.type === "announcement" ? Megaphone : 
                                       notif.type === "message" ? MessageSquare : AlertTriangle;
                          const iconColor = notif.type === "announcement" ? "bg-blue-100 text-blue-600" :
                                           notif.type === "message" ? "bg-emerald-100 text-emerald-600" :
                                           "bg-rose-100 text-rose-600";
                          return (
                            <div 
                              key={notif.id}
                              className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors"
                            >
                              <div className={cn("rounded-lg p-2 shrink-0", iconColor)}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 line-clamp-1">{notif.title}</p>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.description}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {unreadNotifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                        <button
                          onClick={async () => {
                            const recordIds = unreadNotifications.filter((n) => n.recordId).map((n) => n.recordId!);
                            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                            if (recordIds.length) {
                              try {
                                await fetch("/api/notifications/read", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ recordIds }),
                                });
                              } catch {
                                setNotifications((prev) => prev.map((n) => recordIds.includes(n.recordId!) ? { ...n, isRead: false } : n));
                              }
                            }
                          }}
                          className="text-sm font-medium text-slate-600 hover:text-slate-800"
                        >
                          Mark all read
                        </button>
                        <Link 
                          href="/admin/announcements" 
                          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          onClick={() => setNotificationsOpen(false)}
                        >
                          View all
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Session Selector */}
              <SessionSelector />

              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-900">{userName}</p>
                  <p className="text-xs text-slate-500">{role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                </div>
                <div className="h-9 w-9 rounded-full flex items-center justify-center font-semibold overflow-hidden" style={{ backgroundColor: `${primaryColor ?? "#0B1F4D"}20`, color: primaryColor ?? "#0B1F4D" }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={userName} className="h-9 w-9 object-cover" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
    </IsInsideShell.Provider>
    </ActiveSessionProvider>
  );
}

function SessionSelector() {
  const { activeSession, activeTerm, sessions, terms, loading, setActiveSession, setActiveTerm } = useActiveSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <span>Loading…</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return null;
  }

  const displayLabel = activeSession
    ? `${activeSession.name}${activeTerm ? ` — ${activeTerm.name}` : ""}`
    : "Select Session";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300"
        title="Select active academic session and term"
      >
        <CalendarDays className="h-4 w-4 text-slate-500" />
        <span className="max-w-[160px] truncate">{displayLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Academic Session & Term</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Session controls most data. Term narrows it further.</p>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {sessions.map((session) => {
              const sessionTerms = terms.filter((t) => t.sessionId === session.id);
              const isActive = activeSession?.id === session.id;
              return (
                <div key={session.id} className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isActive) {
                        void setActiveSession(session.id);
                      }
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition",
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate">{session.name}</span>
                    {isActive && <span className="ml-2 shrink-0 text-[10px] font-bold">ACTIVE</span>}
                    {session.isCurrent && !isActive && (
                      <span className="ml-2 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </button>
                  {sessionTerms.length > 0 && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-2">
                      {sessionTerms.map((term) => {
                        const termActive = activeTerm?.id === term.id && isActive;
                        return (
                          <button
                            key={term.id}
                            type="button"
                            onClick={() => {
                              if (!isActive) {
                                void setActiveSession(session.id);
                              } else if (!termActive) {
                                void setActiveTerm(term.id);
                              }
                              setOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] transition",
                              termActive
                                ? "bg-indigo-50 text-indigo-700 font-medium"
                                : "text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", termActive ? "bg-indigo-500" : "bg-slate-300")} />
                            <span className="truncate">{term.name}</span>
                            {term.isCurrent && (
                              <span className="ml-auto shrink-0 rounded bg-emerald-50 px-1 py-0 text-[10px] text-emerald-600">
                                current
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
