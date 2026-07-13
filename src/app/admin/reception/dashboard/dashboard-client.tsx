"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Users, MessageSquare, Phone, LogOut, HelpCircle,
  TrendingUp, TrendingDown, Calendar,
  BarChart3, PieChart, Activity, Download
} from "lucide-react";

export type DashboardData = {
  enquiries: {
    total: number;
    byStage: Record<string, number>;
    byType: Record<string, number>;
    bySource: Record<string, number>;
    thisWeek: number;
    lastWeek: number;
    trend: number;
    conversionRate: number;
    newThisMonth: number;
    inProgressThisMonth: number;
  };
  admissions: {
    thisMonthStudents: number;
    lastMonthStudents: number;
    thisYearStudents: number;
    studentGrowth: number;
  };
  gatePasses: {
    total: number;
    active: number;
    returned: number;
    overdue: number;
  };
  complaints: {
    total: number;
    open: number;
    resolved: number;
    inProgress: number;
  };
  callLogs: {
    total: number;
    today: number;
    avgDuration: number;
  };
  visitors: {
    today: number;
    checkedIn: number;
    thisMonth: number;
    byPurpose: Record<string, number>;
  };
};

export function DashboardClient({ schoolId: _schoolId }: { schoolId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "enquiries" | "admissions" | "visitors">("overview");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/reception/dashboard", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-6 text-slate-500">Failed to load dashboard data</div>;
  }

  const trendUp = data.enquiries.trend >= 0;

  return (
    <div className="space-y-6">
      {/* Header Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "enquiries", label: "Enquiries & Leads", icon: MessageSquare },
          { id: "admissions", label: "Admissions & Conversion", icon: TrendingUp },
          { id: "visitors", label: "Visitors & Traffic", icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="Total Enquiries"
              value={data.enquiries.total}
              trend={data.enquiries.trend}
              trendLabel="vs last week"
              icon={MessageSquare}
              color="blue"
            />
            <KPICard
              title="Active Visitors"
              value={data.visitors.checkedIn}
              subValue={`${data.visitors.today} today`}
              icon={Users}
              color="emerald"
            />
            <KPICard
              title="Open Complaints"
              value={data.complaints.open}
              subValue={`${data.complaints.total} total`}
              icon={HelpCircle}
              color="amber"
            />
            <KPICard
              title="Calls Today"
              value={data.callLogs.today}
              subValue={`${data.callLogs.total} this month`}
              icon={Phone}
              color="purple"
            />
          </div>

          {/* Quick Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <QuickStat
              title="Gate Passes"
              stats={[
                { label: "Active", value: data.gatePasses.active, color: "amber" },
                { label: "Returned", value: data.gatePasses.returned, color: "emerald" },
                { label: "Overdue", value: data.gatePasses.overdue, color: "rose" },
              ]}
              icon={LogOut}
            />
            <QuickStat
              title="Enquiry Pipeline"
              stats={[
                { label: "New", value: data.enquiries.byStage["New"] || 0, color: "blue" },
                { label: "In Progress", value: data.enquiries.byStage["In Progress"] || 0, color: "amber" },
                { label: "Resolved", value: data.enquiries.byStage["Resolved"] || 0, color: "emerald" },
              ]}
              icon={TrendingUp}
            />
            <QuickStat
              title="Visitor Purposes"
              stats={Object.entries(data.visitors.byPurpose)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([label, value]) => ({ label, value, color: "indigo" }))}
              icon={Users}
            />
          </div>
        </div>
      )}

      {/* ENQUIRIES TAB */}
      {activeTab === "enquiries" && (
        <div className="space-y-6">
          {/* Enquiry Trend */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Lead Generation Trend
              </h3>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium px-2.5 py-1 rounded-full",
                  trendUp ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                )}>
                  {trendUp ? "+" : ""}{data.enquiries.trend}% this week
                </span>
              </div>
            </div>
            
            <div className="flex items-end gap-8 h-40">
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Last Week</span>
                  <span className="font-semibold">{data.enquiries.lastWeek}</span>
                </div>
                <div className="h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-slate-300 rounded-lg transition-all"
                    style={{ height: "100%" }}
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">This Week</span>
                  <span className="font-semibold text-indigo-600">{data.enquiries.thisWeek}</span>
                </div>
                <div className="h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-lg transition-all"
                    style={{ 
                      height: `${Math.min((data.enquiries.thisWeek / Math.max(data.enquiries.lastWeek, 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* By Source */}
            <ChartCard title="Leads by Source" icon={PieChart}>
              <div className="space-y-3">
                {Object.entries(data.enquiries.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => {
                    const total = data.enquiries.total || 1;
                    const pct = (count / total) * 100;
                    return (
                      <BarRow key={source} label={source} value={count} percent={pct} color="indigo" />
                    );
                  })}
              </div>
            </ChartCard>

            {/* By Type */}
            <ChartCard title="Leads by Type" icon={BarChart3}>
              <div className="space-y-3">
                {Object.entries(data.enquiries.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const total = data.enquiries.total || 1;
                    const pct = (count / total) * 100;
                    return (
                      <BarRow key={type} label={type} value={count} percent={pct} color="emerald" />
                    );
                  })}
              </div>
            </ChartCard>
          </div>

          {/* Stage Funnel */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Enquiry Pipeline Funnel</h3>
            <div className="flex items-end gap-2 h-48">
              {["New", "In Progress", "Follow-up", "Resolved", "Closed"].map((stage, i) => {
                const count = data.enquiries.byStage[stage] || 0;
                const maxCount = Math.max(...Object.values(data.enquiries.byStage), 1);
                const height = (count / maxCount) * 100;
                const colors = ["bg-blue-500", "bg-amber-500", "bg-orange-500", "bg-emerald-500", "bg-slate-400"];
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">{count}</span>
                    <div 
                      className={cn("w-full rounded-t-lg transition-all", colors[i])}
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                    <span className="text-xs text-slate-600 text-center">{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADMISSIONS TAB */}
      {activeTab === "admissions" && (
        <div className="space-y-6">
          {/* Admissions KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="New Enquiries This Month"
              value={data.enquiries.newThisMonth}
              subValue={`${data.enquiries.inProgressThisMonth} in progress`}
              icon={MessageSquare}
              color="blue"
            />
            <KPICard
              title="Students Admitted This Month"
              value={data.admissions.thisMonthStudents}
              trend={data.admissions.studentGrowth}
              trendLabel="vs last month"
              icon={TrendingUp}
              color="emerald"
            />
            <KPICard
              title="Conversion Rate"
              value={data.enquiries.conversionRate}
              subValue="% of enquiries resolved"
              icon={Activity}
              color="indigo"
            />
            <KPICard
              title="Year to Date Admissions"
              value={data.admissions.thisYearStudents}
              icon={Calendar}
              color="purple"
            />
          </div>

          {/* Conversion Funnel */}
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Enquiry to Admission Conversion</h3>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="h-24 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold text-blue-600">{data.enquiries.total}</span>
                </div>
                <p className="text-sm font-medium text-slate-700">Total Enquiries</p>
              </div>
              <div className="px-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-400">→</div>
                  <p className="text-xs text-slate-500">{data.enquiries.conversionRate}% convert</p>
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="h-24 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold text-emerald-600">
                    {Math.round(data.enquiries.total * (data.enquiries.conversionRate / 100))}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-700">Estimated Admissions</p>
              </div>
              <div className="px-4">
                <div className="text-2xl font-bold text-slate-400">→</div>
              </div>
              <div className="flex-1 text-center">
                <div className="h-24 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold text-indigo-600">{data.admissions.thisYearStudents}</span>
                </div>
                <p className="text-sm font-medium text-slate-700">Active Students</p>
              </div>
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            <ChartCard title="Admissions This Month vs Last Month" icon={BarChart3}>
              <div className="flex items-end gap-8 h-40">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Last Month</span>
                    <span className="font-semibold">{data.admissions.lastMonthStudents}</span>
                  </div>
                  <div className="h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-slate-300 rounded-lg transition-all"
                      style={{ height: "100%" }}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">This Month</span>
                    <span className="font-semibold text-indigo-600">{data.admissions.thisMonthStudents}</span>
                  </div>
                  <div className="h-24 bg-slate-100 rounded-lg relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-lg transition-all"
                      style={{ 
                        height: `${Math.min((data.admissions.thisMonthStudents / Math.max(data.admissions.lastMonthStudents, 1)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Pipeline Status This Month" icon={PieChart}>
              <div className="space-y-3">
                {[
                  { label: "New Enquiries", value: data.enquiries.newThisMonth, color: "blue" },
                  { label: "In Progress", value: data.enquiries.inProgressThisMonth, color: "amber" },
                  { label: "Admitted", value: data.admissions.thisMonthStudents, color: "emerald" },
                ].map((item) => {
                  const total = Math.max(data.enquiries.newThisMonth + data.enquiries.inProgressThisMonth + data.admissions.thisMonthStudents, 1);
                  const pct = (item.value / total) * 100;
                  return (
                    <BarRow 
                      key={item.label} 
                      label={item.label} 
                      value={item.value} 
                      percent={pct} 
                      color={item.color as "blue" | "amber" | "emerald"} 
                    />
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* VISITORS TAB */}
      {activeTab === "visitors" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Visitor Purposes */}
            <ChartCard title="Visitor Purposes" icon={Users}>
              <div className="space-y-3">
                {Object.entries(data.visitors.byPurpose)
                  .sort((a, b) => b[1] - a[1])
                  .map(([purpose, count]) => {
                    const total = data.visitors.thisMonth || 1;
                    const pct = (count / total) * 100;
                    return (
                      <BarRow key={purpose} label={purpose} value={count} percent={pct} color="amber" />
                    );
                  })}
              </div>
            </ChartCard>

            {/* Monthly Traffic */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Traffic
              </h3>
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <p className="text-5xl font-bold text-indigo-600">{data.visitors.thisMonth}</p>
                  <p className="text-slate-600 mt-2">Visitors this month</p>
                  <p className="text-sm text-slate-400">{data.visitors.today} today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>
    </div>
  );
}

// Component: KPI Card
function KPICard({ 
  title, 
  value, 
  trend, 
  trendLabel,
  subValue,
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  trend?: number;
  trendLabel?: string;
  subValue?: string;
  icon: any;
  color: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-600" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                {trend >= 0 ? "+" : ""}{trend}% {trendLabel}
              </span>
            </div>
          )}
          {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colorClasses[color as keyof typeof colorClasses])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// Component: Quick Stat
function QuickStat({ title, stats, icon: Icon }: { 
  title: string; 
  stats: { label: string; value: number; color: string }[];
  icon: any;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="h-4 w-4 text-slate-600" />
        </div>
        <h4 className="font-medium text-slate-900">{title}</h4>
      </div>
      <div className="space-y-2">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{stat.label}</span>
            <span className={cn(
              "text-sm font-semibold px-2 py-0.5 rounded-full",
              stat.color === "blue" && "bg-blue-100 text-blue-700",
              stat.color === "emerald" && "bg-emerald-100 text-emerald-700",
              stat.color === "amber" && "bg-amber-100 text-amber-700",
              stat.color === "rose" && "bg-rose-100 text-rose-700",
              stat.color === "indigo" && "bg-indigo-100 text-indigo-700",
            )}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Component: Chart Card
function ChartCard({ title, icon: Icon, children }: { 
  title: string; 
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-600" />
        {title}
      </h3>
      {children}
    </div>
  );
}

// Component: Bar Row
function BarRow({ label, value, percent, color }: { 
  label: string; 
  value: number; 
  percent: number;
  color: string;
}) {
  const colorClasses = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-sm text-slate-600 truncate">{label}</span>
      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
        <div 
          className={cn("h-full rounded-lg flex items-center justify-end px-2 transition-all", colorClasses[color as keyof typeof colorClasses])}
          style={{ width: `${Math.max(percent, value > 0 ? 8 : 0)}%` }}
        >
          {value > 0 && <span className="text-xs font-medium text-white">{value}</span>}
        </div>
      </div>
      <span className="w-8 text-sm font-medium text-slate-900">{Math.round(percent)}%</span>
    </div>
  );
}
