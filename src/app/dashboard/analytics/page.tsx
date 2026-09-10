"use client";

import { useAccounting } from "@/lib/AccountingContext";
import { useMemo, useState, useEffect } from "react";
import WeeklyStatusChart from "@/components/WeeklyStatusChart";
import { BarChart2, TrendingUp, Calendar, IndianRupee } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekBounds() {
  // Compute start (Sunday 00:00:00) and end (Saturday 23:59:59) of current week
  // using local time (Asia/Kolkata awareness handled by JS Date which uses system TZ)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dayOfWeek); // rewind to Sunday

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export default function AnalyticsPage() {
  const { journalEntries, accounts } = useAccounting();
  const [currentWeekLabel, setCurrentWeekLabel] = useState("");

  useEffect(() => {
    const { start, end } = getWeekBounds();
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    setCurrentWeekLabel(`${fmt(start)} – ${fmt(end)}`);
  }, []);

  const weeklyData = useMemo(() => {
    const { start, end } = getWeekBounds();

    // Zero-initialize all 7 days
    const dayMap: Record<string, number> = {};
    DAYS.forEach((d) => (dayMap[d] = 0));

    journalEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate < start || entryDate > end) return;

      // Sales A/c = account id '4', credited on a sale
      const salesLine = entry.lines.find(
        (l) => l.accountId === "4" && l.type === "Credit"
      );
      if (salesLine) {
        const dayName = DAYS[entryDate.getDay()];
        dayMap[dayName] = (dayMap[dayName] || 0) + salesLine.amount;
      }
    });

    return DAYS.map((day) => ({ day, amount: dayMap[day] }));
  }, [journalEntries]);

  const totalThisWeek = weeklyData.reduce((s, d) => s + d.amount, 0);
  const peakDay = weeklyData.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    weeklyData[0] ?? { day: "-", amount: 0 }
  );
  const activeDays = weeklyData.filter((d) => d.amount > 0).length;

  // Monthly data (last 30 days grouped by week)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; amount: number }[] = [];

    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const total = journalEntries
        .filter((e) => {
          const d = new Date(e.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((sum, e) => {
          const salesLine = e.lines.find(
            (l) => l.accountId === "4" && l.type === "Credit"
          );
          return sum + (salesLine?.amount ?? 0);
        }, 0);

      const label = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
      weeks.push({ label, amount: total });
    }
    return weeks;
  }, [journalEntries]);

  const totalSales = accounts.find((a) => a.id === "4")?.balance || 0;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">
      {/* Page Header */}
      <div className="pt-4 mb-6 scroll-reveal">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <BarChart2 size={20} className="text-indigo-600" />
          Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Sales performance &amp; weekly trends
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 scroll-reveal scroll-stagger">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Calendar size={16} className="text-indigo-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              This Week
            </p>
          </div>
          <p className="text-2xl font-black text-slate-800">
            ₹{totalThisWeek.toLocaleString()}
          </p>
          {currentWeekLabel && (
            <p className="text-[10px] text-slate-400 mt-1">{currentWeekLabel}</p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Peak Day
            </p>
          </div>
          <p className="text-2xl font-black text-slate-800">{peakDay.day}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            ₹{peakDay.amount.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
              <IndianRupee size={16} className="text-violet-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              All-Time Sales
            </p>
          </div>
          <p className="text-2xl font-black text-slate-800">
            ₹{Math.abs(totalSales).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {activeDays} active day{activeDays !== 1 ? "s" : ""} this week
          </p>
        </div>
      </div>

      {/* Weekly Status Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 scroll-reveal">
        <WeeklyStatusChart data={weeklyData} />
      </div>

      {/* Last 4 Weeks Bar Summary */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 scroll-reveal">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">
          Last 4 Weeks
        </h2>
        <div className="space-y-3">
          {monthlyData.map((week, idx) => {
            const maxAmt = Math.max(...monthlyData.map((w) => w.amount), 1);
            const pct = (week.amount / maxAmt) * 100;
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-20 shrink-0">
                  {week.label}
                </span>
                <div className="flex-1 bg-slate-50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-20 text-right shrink-0">
                  ₹{week.amount.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
