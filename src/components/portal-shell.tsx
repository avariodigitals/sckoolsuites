import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { APP_POWERED_BY } from "@/lib/constants";
import { navByRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { AcademicContextSwitcher } from "@/components/academic-context-switcher";
import { PortalTopbar } from "@/components/portal-topbar";
import { SignOutButton } from "@/components/sign-out-button";
import { StaffClockInButton } from "@/components/staff-clock-in-button";

export function PortalShell({
  role,
  schoolName,
  schoolLogoUrl,
  userName,
  avatarUrl,
  pathname,
  currentSessionName,
  currentTermName,
  sessions,
  terms,
  selectedSessionId,
  selectedTermId,
  primaryColor,
  secondaryColor,
  children,
}: {
  role: string;
  schoolName?: string;
  schoolLogoUrl?: string;
  userName: string;
  avatarUrl?: string;
  pathname: string;
  currentSessionName?: string | null;
  currentTermName?: string | null;
  sessions?: Array<{ id: string; name: string }>;
  terms?: Array<{ id: string; name: string; sessionId: string }>;
  selectedSessionId?: string | null;
  selectedTermId?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  children: React.ReactNode;
}) {
  const nav = navByRole[role] ?? [];
  const activeTermLabel = currentSessionName || currentTermName ? `${currentSessionName ?? "-"} / ${currentTermName ?? "-"}` : "No academic context selected";
  const displaySchoolName = schoolName?.trim() || "School";
  const normalizedSchoolLogoUrl = schoolLogoUrl
    ? schoolLogoUrl.startsWith("http://") || schoolLogoUrl.startsWith("https://") || schoolLogoUrl.startsWith("/")
      ? schoolLogoUrl
      : `/${schoolLogoUrl}`
    : undefined;
  const schoolInitials = displaySchoolName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  console.log("[PortalShell] schoolLogoUrl prop:", schoolLogoUrl);
  console.log("[PortalShell] normalizedSchoolLogoUrl:", normalizedSchoolLogoUrl);
  console.log("[PortalShell] avatarUrl prop:", avatarUrl);

  return (
    <div
      className="glass-bg min-h-screen"
      style={
        {
          "--brand-primary": primaryColor ?? "#0B1F4D",
          "--brand-secondary": secondaryColor ?? "#0E9F6E",
        } as Record<string, string>
      }
    >
      <input id="shell-collapse" type="checkbox" className="peer hidden" />
      <div className="grid w-full grid-cols-1 gap-4 px-4 py-4 transition-all duration-300 lg:[grid-template-columns:260px_1fr] peer-checked:lg:[grid-template-columns:92px_1fr] peer-checked:[&_.nav-label]:hidden peer-checked:[&_.when-expanded]:hidden peer-checked:[&_.when-collapsed]:block peer-checked:[&_.nav-item]:justify-center peer-checked:[&_.nav-item]:px-2 peer-checked:[&_.signout-btn]:justify-center">
        <aside className="no-print glass-panel rounded-2xl p-4 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden lg:flex lg:flex-col">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <div className="flex flex-col items-center text-center">
              {normalizedSchoolLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizedSchoolLogoUrl}
                  alt={`${displaySchoolName} logo`}
                  className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-contain p-2 dark:border-slate-700 dark:bg-slate-900"
                  onError={(e) => { console.error("[PortalShell] logo failed to load:", normalizedSchoolLogoUrl, e); }}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  {schoolInitials || "SS"}
                </div>
              )}
              <p className="nav-label mt-3 line-clamp-2 text-base font-semibold leading-tight text-slate-900 dark:text-slate-100">{displaySchoolName}</p>
            </div>
          </div>
          <label
            htmlFor="shell-collapse"
            className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PanelLeftClose className="when-expanded h-4 w-4" />
            <PanelLeftOpen className="when-collapsed hidden h-4 w-4" />
            <span className="nav-label">Collapse Sidebar</span>
          </label>
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
            <nav className="space-y-1">
              {nav.map((item, index) => {
                const previousGroup = nav[index - 1]?.group;
                const showGroup = item.group && item.group !== previousGroup;
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <div key={`${item.href}-${item.label}`} className="space-y-1">
                    {showGroup ? <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.group}</p> : null}
                    <Link
                      href={item.href}
                      className={cn(
                        "nav-item flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                        active
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      )}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="nav-label peer-checked:hidden">{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="mt-4 lg:mt-6 lg:shrink-0">
            <SignOutButton
              className="signout-btn flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            />
          </div>
        </aside>

        <main className="space-y-4">
          <header className="no-print glass-panel rounded-2xl px-4 py-3">
            <div className="mb-3">
              <PortalTopbar pathname={pathname} userName={userName} avatarUrl={avatarUrl} />
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Welcome back</p>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{userName}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current: {activeTermLabel}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {role !== "PARENT" && role !== "STUDENT" && <StaffClockInButton />}
                {sessions && terms ? (
                  <AcademicContextSwitcher
                    sessions={sessions}
                    terms={terms}
                    initialSessionId={selectedSessionId}
                    initialTermId={selectedTermId}
                  />
                ) : null}
              </div>
            </div>
          </header>
          {children}

          <footer className="glass-panel rounded-2xl px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>{schoolName ?? "Sckool Suite"} • Copyright {new Date().getFullYear()}</p>
              <p>{APP_POWERED_BY}</p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
