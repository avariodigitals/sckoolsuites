"use client";

import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  GraduationCap, 
  BookOpen,
  Calendar,
  Settings,
  ArrowRight,
  Activity,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

function NairaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 4h16M4 20h16M4 8l8 8M20 8l-8 8" />
    </svg>
  );
}

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  graduationCap: GraduationCap,
  dollarSign: NairaIcon as unknown as LucideIcon,
  bookOpen: BookOpen,
  calendar: Calendar,
  settings: Settings,
};

export type StatCardProps = {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  iconName: string;
  href?: string;
};

export function StatCard({ title, value, change, trend = "neutral", iconName, href }: StatCardProps) {
  const Icon = iconMap[iconName] || BookOpen;
  
  return (
    <div className={cn(
      "rounded-xl bg-white p-6 shadow-sm border border-slate-200",
      href && "hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center gap-1 text-sm">
              {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
              <span className={cn(
                trend === "up" && "text-emerald-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-slate-500"
              )}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-indigo-50 p-3">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
      </div>
    </div>
  );
}

const actionIconMap: Record<string, LucideIcon> = {
  users: Users,
  graduationCap: GraduationCap,
  dollarSign: NairaIcon as unknown as LucideIcon,
  bookOpen: BookOpen,
  calendar: Calendar,
  settings: Settings,
  arrowRight: ArrowRight,
};

export type QuickActionProps = {
  title: string;
  description: string;
  href: string;
  iconName: string;
  color?: "indigo" | "emerald" | "amber" | "rose" | "blue";
};

const colorClasses = {
  indigo: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  amber: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  rose: "bg-rose-50 text-rose-600 hover:bg-rose-100",
  blue: "bg-blue-50 text-blue-600 hover:bg-blue-100",
};

export function QuickAction({ title, description, href, iconName, color = "indigo" }: QuickActionProps) {
  const Icon = actionIconMap[iconName] || BookOpen;
  
  return (
    <Link 
      href={href}
      className="group flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className={cn("rounded-lg p-3 transition-colors", colorClasses[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
    </Link>
  );
}

export type SectionCardProps = {
  title: string;
  children: React.ReactNode;
  action?: {
    label: string;
    href: string;
  };
};

export function SectionCard({ title, children, action }: SectionCardProps) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action && (
          <Link 
            href={action.href}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

export type ActivityItemProps = {
  title: string;
  description: string;
  time: string;
  icon?: React.ElementType;
};

export function ActivityItem({ title, description, time, icon: Icon = Activity }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="rounded-full bg-slate-100 p-2">
        <Icon className="h-4 w-4 text-slate-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500 truncate">{description}</p>
        <p className="text-xs text-slate-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 p-4">
        <Activity className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function DashboardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
    </div>
  );
}
