"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';

export default function WeeklySalesChart({ data }: { data: { date: string, displayDate: string, sales: number }[] }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1 text-left">Weekly Sales</h2>
        <div className="bg-slate-50 border border-slate-100 rounded-2xl h-72 animate-pulse w-full"></div>
      </div>
    );
  }

  return (
    <div className="mb-8 animate-in fade-in duration-700">
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1 text-left">Weekly Sales</h2>
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-sm" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={10} tickFormatter={(val) => `₹${val}`} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              formatter={(value: any) => [`₹${value}`, 'Sales']}
            />
            <Bar dataKey="sales" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
