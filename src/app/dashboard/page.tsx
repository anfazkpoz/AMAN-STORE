"use client";

import { useAccounting } from "@/lib/AccountingContext";
import { User as UserType } from "@/lib/types";
import { BookOpen, Library, TrendingUp, Users, KeyRound, ArrowRight, BarChart2, Wallet, Receipt, Landmark } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { accounts, journalEntries } = useAccounting();
  const [studentUsers, setStudentUsers] = useState<UserType[]>([]);

  useEffect(() => {
    const usersStr = localStorage.getItem('aman_store_users');
    if (usersStr) {
      const allUsers: UserType[] = JSON.parse(usersStr);
      setStudentUsers(allUsers.filter(u => u.role === 'Student'));
    }
  }, []);

  const totalSales = accounts.find(a => a.id === '4')?.balance || 0;
  const cashInHand = accounts.find(a => a.id === '1')?.balance || 0;
  const bankBalance = accounts.find(a => a.id === '2')?.balance || 0;
  const totalDebtorsAmount = accounts
    .filter(a => a.type === 'Asset' && !['1', '2'].includes(a.id) && a.balance > 0)
    .reduce((sum, a) => sum + a.balance, 0);

  const stats = [
    {
      label: "Total Sales",
      value: `₹${Math.abs(totalSales).toLocaleString()}`,
      icon: BarChart2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      accent: "bg-emerald-500",
    },
    {
      label: "Outstanding Dues",
      value: `₹${totalDebtorsAmount.toLocaleString()}`,
      icon: Receipt,
      color: "text-rose-500",
      bg: "bg-rose-50",
      accent: "bg-rose-500",
    },
    {
      label: "Cash in Hand",
      value: `₹${cashInHand.toLocaleString()}`,
      icon: Wallet,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      accent: "bg-indigo-500",
    },
    {
      label: "Cash in Bank",
      value: `₹${bankBalance.toLocaleString()}`,
      icon: Landmark,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      accent: "bg-cyan-500",
    },
  ];

  const modules = [
    {
      title: "Journal Entries",
      desc: "Post and view transactions",
      icon: BookOpen,
      href: "/dashboard/journal",
      accent: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "General Ledger",
      desc: "Account-wise statements",
      icon: Library,
      href: "/dashboard/ledger",
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Debtor Management",
      desc: "Student fees & charges",
      icon: Users,
      href: "/dashboard/debtors",
      accent: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Reports",
      desc: "P&L, Trial Balance & more",
      icon: TrendingUp,
      href: "/dashboard/reports",
      accent: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24">

      {/* Page Title */}
      <div className="pt-4 mb-6">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Welcome back — here's your store summary.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex"
          >
            {/* Left accent bar */}
            <div className={`w-1 shrink-0 ${stat.accent}`} />
            <div className="flex items-center gap-3 px-4 py-4 flex-1">
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                <stat.icon size={19} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">{stat.label}</p>
                <p className={`text-xl font-black leading-none ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map(mod => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col gap-3"
            >
              <div className={`w-10 h-10 ${mod.bg} ${mod.accent} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <mod.icon size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{mod.title}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{mod.desc}</p>
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${mod.accent} opacity-0 group-hover:opacity-100 transition-opacity`}>
                Open <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="my-8 border-t border-slate-100" />

      {/* Student Credentials */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-indigo-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Student Credentials</h2>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">{studentUsers.length} students</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Batch</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {studentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm italic">
                    No students registered yet.
                  </td>
                </tr>
              ) : (
                studentUsers.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800">{student.name}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
                        {student.batch}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500 text-xs">{student.phone}</td>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-red-500 tracking-wider">
                      {student.password}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
