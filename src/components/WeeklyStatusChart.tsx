"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";

interface DayData {
  day: string;
  amount: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: 12, color: "#64748b", marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontWeight: 800, fontSize: 16, color: "#6366f1" }}>
          ₹{Number(payload[0].value).toLocaleString()}
        </p>
        <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Daily Status</p>
      </div>
    );
  }
  return null;
};

export default function WeeklyStatusChart({ data }: { data: DayData[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure all 7 days are represented in correct Sun–Sat order
  const chartData: DayData[] = DAYS.map((day) => {
    const found = data?.find((d) => d.day === day);
    return { day, amount: found?.amount ?? 0 };
  });

  const today = DAYS[new Date().getDay()];

  if (!mounted) {
    return (
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">
          Weekly Status
        </h2>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl h-64 animate-pulse w-full" />
      </div>
    );
  }

  return (
    <div className="mb-6 animate-in fade-in duration-700">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1 text-left">
        Weekly Status
      </h2>
      <div
        className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm"
        style={{ height: "280px" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              dx={10}
              tickFormatter={(val) => `₹${val}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={52}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.day}
                  fill={entry.day === today ? "#6366f1" : "#c7d2fe"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-400 font-medium mt-2 px-1">
        Darker bar = today · Sun → Sat
      </p>
    </div>
  );
}
