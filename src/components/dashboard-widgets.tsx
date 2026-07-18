import Link from "next/link";
import { ArrowUpRight, BellDot, Sparkles, Zap } from "lucide-react";

export type StatCardItem = {
  label: string;
  value: string;
  hint: string;
  trend?: string;
};

export type QuickActionItem = {
  label: string;
  href: string;
};

export type SeriesItem = {
  label: string;
  value: number;
};

export type FeedItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
};

const CARD_ACCENTS = [
  "border-t-slate-700",
  "border-t-blue-700",
  "border-t-emerald-700",
  "border-t-amber-700",
  "border-t-violet-700",
  "border-t-cyan-700",
  "border-t-indigo-700",
  "border-t-slate-700",
];

export function DashboardHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Workspace Overview</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
          Enterprise Intelligence
        </button>
      </div>
    </section>
  );
}

export function DashboardStatCards({ items }: { items: StatCardItem[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => {
        const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
        return (
          <article key={item.label} className={`rounded-2xl border border-slate-200 border-t-4 ${accent} bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900`}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">{item.label}</p>
            <p className="mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold leading-none text-slate-900 dark:text-slate-100 truncate">{item.value}</p>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{item.hint}</p>
            {item.trend && (
              <span className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ArrowUpRight className="h-3 w-3" />{item.trend}
              </span>
            )}
          </article>
        );
      })}
    </section>
  );
}

export function DashboardQuickActions({ items }: { items: QuickActionItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <Zap className="h-4 w-4 text-amber-500" />
        Quick Actions
      </h3>
      {items.length ? (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <Link
              key={item.label + item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState message="No quick actions configured for this role." />
      )}
    </section>
  );
}

export function DashboardSeries({ title, subtitle, data }: { title: string; subtitle: string; data: SeriesItem[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {data.length ? (
        <div className="space-y-3">
          {data.map((item) => {
            const width = (item.value / max) * 100;
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-3 rounded-full bg-slate-700 dark:bg-slate-300"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="No analytics data available for this period." />
      )}
    </section>
  );
}

export function ActivityFeed({ title, items }: { title: string; items: FeedItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className={`rounded-xl border-l-4 border-l-slate-400 bg-slate-50 p-3 dark:bg-slate-800/60`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.time}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No recent activity yet." />
      )}
    </section>
  );
}

export function AnnouncementWidget({ items }: { items: FeedItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
        <BellDot className="h-4 w-4 text-slate-500" />
        Announcements &amp; Events
      </h3>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/40">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{item.time}</p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No announcements available." />
      )}
    </section>
  );
}

export function TaskWidget({ items }: { items: FeedItem[] }) {
  const urgencyStyle: Record<string, string> = {
    Now:       "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    Today:     "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    Tomorrow:  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    Soon:      "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  };
  const defaultBadge = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-slate-100">Pending Tasks</h3>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/40">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              </div>
              <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${urgencyStyle[item.time] ?? defaultBadge}`}>{item.time}</span>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState message="No pending tasks right now." />
      )}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/40 dark:text-slate-400">{message}</div>;
}

