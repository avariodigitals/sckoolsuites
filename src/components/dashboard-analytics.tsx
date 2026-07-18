"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, TrendingUp, PieChart as PieIcon, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type DateFilter = "week" | "month" | "year" | "custom";

interface DashboardAnalyticsProps {
  incomeData: {
    date: string;
    income: number;
    expenses: number;
  }[];
  feeComponents: {
    name: string;
    value: number;
  }[];
}

export function DashboardAnalytics({ incomeData, feeComponents }: DashboardAnalyticsProps) {
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const filterLabels: Record<DateFilter, string> = {
    week: "This Week",
    month: "This Month",
    year: "This Year",
    custom: "Custom Range",
  };

  const totalIncome = useMemo(() => incomeData.reduce((sum, d) => sum + d.income, 0), [incomeData]);
  const totalExpenses = useMemo(() => incomeData.reduce((sum, d) => sum + d.expenses, 0), [incomeData]);
  const netRevenue = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">Financial Analytics</h2>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setChartType("bar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                chartType === "bar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Bar
            </button>
            <button
              onClick={() => setChartType("line")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                chartType === "line" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <TrendingUp className="h-4 w-4" />
              Line
            </button>
          </div>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {filterLabels[dateFilter]}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFilterDropdown ? "rotate-180" : "")} />
            </Button>
            
            {showFilterDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowFilterDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                  {(Object.keys(filterLabels) as DateFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        setDateFilter(filter);
                        setShowFilterDropdown(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2 text-sm text-left transition-colors",
                        dateFilter === filter
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {filterLabels[filter]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-emerald-600">Total Income</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-900 truncate">₦{totalIncome.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-2.5 sm:p-3 shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-rose-600">Total Expenses</p>
                <p className="mt-2 text-xl sm:text-2xl font-bold text-rose-900 truncate">₦{totalExpenses.toLocaleString()}</p>
              </div>
              <div className="rounded-full bg-rose-100 p-2.5 sm:p-3 shrink-0">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600 rotate-180" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-indigo-100",
          netRevenue >= 0 ? "bg-indigo-50/50" : "bg-amber-50/50 border-amber-100"
        )}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn(
                  "text-xs sm:text-sm font-medium",
                  netRevenue >= 0 ? "text-indigo-600" : "text-amber-600"
                )}>Net Revenue</p>
                <p className={cn(
                  "mt-2 text-xl sm:text-2xl font-bold truncate",
                  netRevenue >= 0 ? "text-indigo-900" : "text-amber-900"
                )}>₦{netRevenue.toLocaleString()}</p>
              </div>
              <div className={cn(
                "rounded-full p-2.5 sm:p-3 shrink-0",
                netRevenue >= 0 ? "bg-indigo-100" : "bg-amber-100"
              )}>
                <PieIcon className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6",
                  netRevenue >= 0 ? "text-indigo-600" : "text-amber-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Income vs Expenses Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={incomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="income" 
                      name="Income" 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                    <Bar 
                      dataKey="expenses" 
                      name="Expenses" 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={incomeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value) => [`₦${Number(value).toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      name="Income" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      name="Expenses" 
                      stroke="#ef4444" 
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Fee Components Pie Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Income by Fee Component</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeComponents}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {feeComponents.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Amount']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Components Table */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold text-slate-900">Fee Component Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Component</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Percentage</th>
                  <th className="px-4 py-3 font-medium">Visual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeComponents.map((component, index) => {
                  const total = feeComponents.reduce((sum, c) => sum + c.value, 0);
                  const percentage = (component.value / total) * 100;
                  return (
                    <tr key={component.name} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-slate-900">{component.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        ₦{component.value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 w-32">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
