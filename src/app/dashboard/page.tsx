"use client";

import { useAccounting } from "@/lib/AccountingContext";
import { User as UserType } from "@/lib/types";
import { 
  BookOpen, Library, TrendingUp, Users, KeyRound, 
  ArrowRight, BarChart2, Wallet, Receipt, Landmark,
  Eye, EyeOff, Search
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

export default function DashboardPage() {
  const { accounts, journalEntries } = useAccounting();
  const [studentUsers, setStudentUsers] = useState<UserType[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [credentialSearch, setCredentialSearch] = useState("");

  const filteredStudentUsers = useMemo(() => {
    if (!credentialSearch) return studentUsers;
    const lower = credentialSearch.toLowerCase();
    return studentUsers.filter(u => 
      u.name.toLowerCase().includes(lower) || 
      (u.phone && u.phone.includes(lower)) ||
      (u.batch && u.batch.toLowerCase().includes(lower))
    );
  }, [studentUsers, credentialSearch]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/users?role=Student');
        if (res.ok) {
          const data = await res.json();
          const BATCHES = ['JD1', 'JD2', 'JD3', 'HS1', 'HS2', 'BS1', 'BS2', 'BS3', 'BS4', 'BS5'];
          const normalized = Array.isArray(data) ? data.map((u: any) => ({ ...u, id: u._id })) : [];
          
          // Sort by Batch Order and then by Name
          const sorted = normalized.sort((a, b) => {
            const idxA = a.batch ? BATCHES.indexOf(a.batch) : -1;
            const idxB = b.batch ? BATCHES.indexOf(b.batch) : -1;
            if (idxA !== idxB) return idxA - idxB;
            return a.name.localeCompare(b.name);
          });
          
          setStudentUsers(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch students:", err);
      }
    };
    fetchStudents();
  }, []);

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [todayMetrics, setTodayMetrics] = useState({ sales: 0, collection: 0 });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setTodayMetrics({ sales: data.sales || 0, collection: data.collection || 0 });
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [journalEntries]);

  const totalSales = accounts.find(a => a.id === '4')?.balance || 0;
  const cashInHand = accounts.find(a => a.id === '1')?.balance || 0;
  const bankBalance = accounts.find(a => a.id === '2')?.balance || 0;
  const totalAssets = accounts
    .filter(a => a.type === 'Asset' && !['1', '2'].includes(a.id) && a.balance > 0)
    .reduce((sum, a) => sum + a.balance, 0);

  const totalLiabilities = accounts
    .filter(a => a.type === 'Asset' && !['1', '2'].includes(a.id) && a.balance < 0)
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

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
      label: "Total Assets (Debtors)",
      value: `₹${totalAssets.toLocaleString()}`,
      icon: Receipt,
      color: "text-rose-500",
      bg: "bg-rose-50",
      accent: "bg-rose-500",
    },
    {
      label: "Total Liabilities (Advances)",
      value: `₹${totalLiabilities.toLocaleString()}`,
      icon: Receipt,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      accent: "bg-emerald-500",
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
        <h1 className="text-xl font-bold text-slate-800 tracking-tight text-left">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5 text-left">Welcome back — here's your store summary.</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        {/* Total Debtors */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Debtors</p>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-rose-500 shrink-0">
              <Users size={14} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">₹{totalAssets.toLocaleString()}</h3>
        </div>

        {/* Total Creditors */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all delay-75 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Creditors</p>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-emerald-500 shrink-0">
              <Receipt size={14} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">₹{totalLiabilities.toLocaleString()}</h3>
        </div>

        {/* Today's Sales */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all delay-150 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Sales</p>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
              <TrendingUp size={14} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">₹{todayMetrics.sales.toLocaleString()}</h3>
        </div>

        {/* Today's Collection */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all delay-200 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Collection</p>
            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-sky-500 shrink-0">
              <Wallet size={14} />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">₹{todayMetrics.collection.toLocaleString()}</h3>
        </div>
        
      </div>
      
      {/* Balances Quick Look */}
      <div className="flex gap-6 mb-8 px-2 animate-in fade-in duration-700">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cash <span className="text-slate-800">₹{cashInHand.toLocaleString()}</span></span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bank <span className="text-slate-800">₹{bankBalance.toLocaleString()}</span></span>
        </div>
      </div>

      {/* Modules */}
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 px-1 text-left">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modules.map(mod => (
            <Link
              key={mod.title}
              href={mod.href}
              className="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col gap-3 text-left"
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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between px-1 gap-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-indigo-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Student Credentials</h2>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3.5 top-2.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search students..." 
            value={credentialSearch}
            onChange={(e) => setCredentialSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-xs font-medium shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden text-left">
        <div className="overflow-x-auto text-left">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold w-1/4">Name</th>
                <th className="px-5 py-3 font-semibold w-1/4">Batch</th>
                <th className="px-5 py-3 font-semibold w-1/4 text-center">Phone</th>
                <th className="px-5 py-3 font-semibold w-1/4 text-right">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm italic">
                    No students match your search.
                  </td>
                </tr>
              ) : (
                (isListExpanded ? filteredStudentUsers : filteredStudentUsers.slice(0, 5)).map(student => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800 w-1/4 truncate">{student.name}</td>
                    <td className="px-5 py-3 w-1/4">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
                        {student.batch}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500 text-xs w-1/4 text-center">{student.phone}</td>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-red-500 tracking-wider text-right w-1/4">
                      <div className="flex items-center justify-end gap-2 group/pass">
                        <span>{showPasswords[student.id] ? student.password : "••••••••"}</span>
                        <button 
                          onClick={() => togglePassword(student.id)}
                          className="p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-md transition-all"
                          title={showPasswords[student.id] ? "Hide Password" : "Show Password"}
                        >
                          {showPasswords[student.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        
        {filteredStudentUsers.length > 5 && (
          <div className="p-3 border-t border-slate-50 bg-slate-50/30 text-center flex items-center justify-between px-6">
            <span className="text-[10px] text-slate-400 italic">Showing {filteredStudentUsers.length} total users</span>
            <button 
              onClick={() => setIsListExpanded(!isListExpanded)}
              className="text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {isListExpanded ? "Show Less" : `See More (${filteredStudentUsers.length - 5} more)`}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
