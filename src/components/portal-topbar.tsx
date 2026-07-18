"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Bell, CalendarCheck, ChevronDown, ChevronRight, FileCheck2, GraduationCap, LogOut, Megaphone, MessageSquareText, Moon, Search, Sun, Trophy, UserCircle, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";

const THEME_EVENT = "sckoolsuite-theme-change";

type NotificationItem = {
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

type NotificationFilter = "all" | NotificationItem["type"];
type DashboardScope = "superadmin" | "admin" | "accountant" | "parent" | "teacher" | "student" | "registrar";

function getThemeSnapshot() {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("ui-theme") === "dark" ? "dark" : "light";
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(THEME_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(THEME_EVENT, handler as EventListener);
  };
}

export function PortalTopbar({
  pathname,
  userName,
  avatarUrl,
}: {
  pathname: string;
  userName: string;
  avatarUrl?: string;
}) {
  const router = useRouter();
  const currentPathname = usePathname() ?? "";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationFilter, setActiveNotificationFilter] = useState<NotificationFilter>("all");
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");
  const dark = theme === "dark";
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const crumbs = useMemo(() => {
    return pathname
      .split("/")
      .filter(Boolean)
      .map((item, index) => {
        if (index === 0 && item.toLowerCase() === "admin") return "Home";
        return item
          .replaceAll("-", " ")
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      });
  }, [pathname]);

  const userInitials = useMemo(() => {
    return userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [userName]);

  const displayName = useMemo(() => {
    const parts = userName.split(" ").filter(Boolean);
    return parts[0] ?? userName;
  }, [userName]);

  const systemStrength = 88;
  const systemStatus = systemStrength >= 85 ? "Operational" : systemStrength >= 65 ? "Stable" : "Attention";

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.isRead), [notifications]);
  const notificationCount = unreadNotifications.length;

  const filteredNotifications = useMemo(() => {
    if (activeNotificationFilter === "all") return unreadNotifications;
    return unreadNotifications.filter((item) => item.type === activeNotificationFilter);
  }, [unreadNotifications, activeNotificationFilter]);

  function notificationTypeLabel(type: NotificationItem["type"]) {
    switch (type) {
      case "contest":
        return "Contest";
      case "announcement":
        return "Announcement";
      case "message":
        return "Message";
      case "complaint":
        return "Complaint";
      case "invoice":
        return "Invoice";
      case "result":
        return "Result";
      case "attendance":
        return "Attendance";
      case "admission":
        return "Admission";
      case "fee_reminder":
        return "Fee Reminder";
      default:
        return type;
    }
  }

  function notificationTypeIcon(type: NotificationItem["type"]) {
    switch (type) {
      case "contest":
        return <Trophy className="h-3.5 w-3.5 text-amber-600" />;
      case "announcement":
        return <Megaphone className="h-3.5 w-3.5 text-blue-600" />;
      case "message":
        return <MessageSquareText className="h-3.5 w-3.5 text-emerald-600" />;
      case "complaint":
        return <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />;
      case "invoice":
      case "fee_reminder":
        return <Wallet className="h-3.5 w-3.5 text-orange-600" />;
      case "result":
        return <GraduationCap className="h-3.5 w-3.5 text-purple-600" />;
      case "attendance":
        return <CalendarCheck className="h-3.5 w-3.5 text-teal-600" />;
      case "admission":
        return <FileCheck2 className="h-3.5 w-3.5 text-green-600" />;
      default:
        return <Bell className="h-3.5 w-3.5 text-slate-600" />;
    }
  }

  function roleScopeFromPath(): DashboardScope {
    if (pathname.startsWith("/super-admin")) return "superadmin";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/accountant")) return "accountant";
    if (pathname.startsWith("/parent")) return "parent";
    if (pathname.startsWith("/teacher")) return "teacher";
    if (pathname.startsWith("/student")) return "student";
    if (pathname.startsWith("/registrar")) return "registrar";
    return "admin";
  }

  function notificationHref(item: NotificationItem) {
    const scope = roleScopeFromPath();

    const routeMap: Record<DashboardScope, Partial<Record<NotificationItem["type"], string>>> = {
      superadmin: {
        contest: "/super-admin/dashboard",
        announcement: "/super-admin/dashboard",
        message: "/super-admin/dashboard",
        complaint: "/super-admin/dashboard",
      },
      admin: {
        contest: "/admin/bills",
        announcement: "/admin/announcements",
        message: "/admin/announcements",
        complaint: "/admin/parents",
      },
      accountant: {
        contest: "/accountant/bills",
        announcement: "/accountant/dashboard",
        message: "/accountant/dashboard",
        complaint: "/accountant/dashboard",
      },
      parent: {
        contest: "/parent/fees",
        announcement: "/parent/announcements",
        message: "/parent/messages",
        complaint: "/parent/complaints",
      },
      teacher: {
        contest: "/teacher/dashboard",
        announcement: "/teacher/announcements",
        message: "/teacher/announcements",
        complaint: "/teacher/dashboard",
      },
      student: {
        contest: "/student/dashboard",
        announcement: "/student/announcements",
        message: "/student/announcements",
        complaint: "/student/dashboard",
      },
      registrar: {
        contest: "/registrar/dashboard",
        announcement: "/registrar/dashboard",
        message: "/registrar/dashboard",
        complaint: "/registrar/dashboard",
      },
    };

    return routeMap[scope][item.type] ?? pathname;
  }

  function isBillContestNotification(item: NotificationItem) {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return item.type === "contest" || (item.type === "message" && (text.includes("bill") || text.includes("contest") || text.includes("review")));
  }

  function notificationTargetLabel(item: NotificationItem) {
    const href = isBillContestNotification(item) && roleScopeFromPath() === "parent" ? "/parent/fees" : notificationHref(item);
    if (href.startsWith("/parent/messages")) return "Opens Messages";
    if (href.startsWith("/parent/complaints")) return "Opens Complaints";
    if (href.startsWith("/parent/fees")) return "Opens Fees & Bills";
    if (href.startsWith("/parent/announcements")) return "Opens Announcements";
    if (href.startsWith("/teacher/announcements")) return "Opens Announcements";
    if (href.startsWith("/student/announcements")) return "Opens Announcements";
    if (href.startsWith("/accountant/bills")) return "Opens Bills";
    if (href.startsWith("/admin/bills")) return "Opens Bills";
    if (href.startsWith("/admin/announcements")) return "Opens Announcements";
    if (href.startsWith("/admin/parents")) return "Opens Parents";
    return "Opens Section";
  }

  function openNotification(item: NotificationItem) {
    const href = item.link || (isBillContestNotification(item) && roleScopeFromPath() === "parent" ? "/parent/fees" : notificationHref(item));
    // Mark as read on server
    if (item.recordId) {
      fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordIds: [item.recordId] }),
      }).catch(() => {});
    }
    // Optimistically update local state
    setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
    setShowNotifications(false);
    router.push(href);
  }

  async function markAllAsRead() {
    const unreadRecordIds = unreadNotifications.filter((n) => n.recordId).map((n) => n.recordId!);
    // Optimistically update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (unreadRecordIds.length) {
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds: unreadRecordIds }),
        });
      } catch {
        // Revert on failure
        setNotifications((prev) => prev.map((n) => unreadRecordIds.includes(n.recordId!) ? { ...n, isRead: false } : n));
      }
    }
  }

  async function loadNotifications() {
    setLoadingNotifications(true);
    setNotificationError("");

    try {
      // Fetch persistent notifications from the new API
      const recordsRes = await fetch("/api/notifications/records", { cache: "no-store" });
      const recordsData = (await recordsRes.json().catch(() => ({}))) as { notifications?: NotificationItem[]; unreadCount?: number; error?: string };

      // Also fetch legacy notifications for backward compatibility
      const legacyRes = await fetch("/api/notifications/latest", { cache: "no-store" });
      const legacyData = (await legacyRes.json().catch(() => ({}))) as { notifications?: NotificationItem[]; error?: string };

      const recordNotifs = Array.isArray(recordsData.notifications) ? recordsData.notifications : [];
      const legacyNotifs = Array.isArray(legacyData.notifications) ? legacyData.notifications : [];

      // Merge: persistent records take priority, then add legacy ones not already present
      const seenIds = new Set(recordNotifs.map((n) => n.id));
      const merged = [...recordNotifs, ...legacyNotifs.filter((n) => !seenIds.has(n.id))];

      setNotifications(merged);
    } catch {
      setNotificationError("Could not load notifications.");
    } finally {
      setLoadingNotifications(false);
    }
  }

  function formatRelativeTime(value: string) {
    const createdAt = new Date(value).getTime();
    if (Number.isNaN(createdAt)) return "Now";

    const diff = Math.max(0, currentTimeMs - createdAt);
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return "Just now";
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    return `${Math.floor(diff / day)}d ago`;
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    // Poll every 15 seconds for near real-time updates
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 15_000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!showNotifications) return;

    const interval = window.setInterval(() => {
      loadNotifications();
    }, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [showNotifications]);

  function toggleTheme() {
    const nextTheme = dark ? "light" : "dark";
    window.localStorage.setItem("ui-theme", nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {crumbs.length ? (
            crumbs.map((crumb, index) => (
              <div key={`${crumb}-${index}`} className="flex items-center gap-1.5">
                <span
                  className={
                    index === crumbs.length - 1
                      ? "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                      : "rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }
                >
                  {crumb}
                </span>
                {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> : null}
              </div>
            ))
          ) : (
            <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">Dashboard</span>
          )}
        </div>

        <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-900/70 dark:bg-emerald-950/40">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">System {systemStatus}</span>
          <span className="text-xs text-emerald-700 dark:text-emerald-400">{systemStrength}%</span>
        </div>
      </div>

      <div className="glass-soft flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <Input className="h-9 w-32 rounded-lg border-slate-200 bg-white pl-9 text-sm md:w-72 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder="Quick search" />
        </div>

        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            className="relative rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              if (next) {
                loadNotifications();
              }
            }}
          >
            <Bell className="h-4 w-4" />
            {notificationCount ? <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{notificationCount > 9 ? "9+" : notificationCount}</span> : null}
          </button>

          {showNotifications ? (
            <div className="fixed bottom-0 left-0 right-0 z-40 sm:absolute sm:bottom-auto sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-80 max-w-80 overflow-hidden rounded-t-2xl sm:rounded-xl border border-slate-200 bg-white shadow-2xl sm:shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="sm:hidden flex justify-center pt-2 pb-1">
                <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Latest Notifications</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    disabled={!unreadNotifications.length}
                    className="text-xs text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Mark all read
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2 py-2 dark:border-slate-700">
                {([
                  { key: "all", label: "All" },
                  { key: "contest", label: "Contests" },
                  { key: "announcement", label: "Announcements" },
                  { key: "message", label: "Messages" },
                  { key: "complaint", label: "Complaints" },
                ] as Array<{ key: NotificationFilter; label: string }>).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveNotificationFilter(item.key)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium ${activeNotificationFilter === item.key ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto p-2">
                {loadingNotifications ? <p className="px-2 py-3 text-xs text-slate-500">Loading notifications...</p> : null}
                {notificationError ? <p className="px-2 py-3 text-xs text-rose-600">{notificationError}</p> : null}
                {!loadingNotifications && !notificationError && filteredNotifications.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-slate-500">No notifications yet.</p>
                ) : null}

                {!loadingNotifications && !notificationError
                  ? filteredNotifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openNotification(item)}
                        className="w-full rounded-lg px-2 py-2 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:hover:bg-slate-800/60 dark:focus:ring-slate-600"
                        title={`Open ${notificationTypeLabel(item.type)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {notificationTypeIcon(item.type)}
                            <p className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                          </div>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{notificationTypeLabel(item.type)}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{formatRelativeTime(item.createdAt)}</span>
                          <span className="font-medium text-slate-500 dark:text-slate-400">{notificationTargetLabel(item)}</span>
                        </div>
                      </button>
                    ))
                  : null}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <details className="group relative ml-auto">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-2 text-sm text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-slate-800 text-[11px] font-semibold text-white dark:bg-slate-700 shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={userName} className="h-8 w-8 object-cover" />
              ) : (
                userInitials || "U"
              )}
            </span>
            <span className="max-w-24 sm:max-w-32 truncate font-semibold text-slate-700 dark:text-slate-100 hidden xs:inline sm:inline">{displayName}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-44 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <Link
              href={`${currentPathname.split("/").slice(0, 2).join("/")}/profile`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <UserCircle className="h-4 w-4 text-slate-400" />
              My Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-4 w-4 text-rose-400" />
              Logout
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
