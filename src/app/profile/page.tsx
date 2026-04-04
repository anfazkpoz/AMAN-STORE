"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, LogOut, CheckCircle2, History, Banknote } from "lucide-react";
import { useAccounting } from "@/lib/AccountingContext";
import { User as UserType } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  
  const { debtors, accounts, journalEntries } = useAccounting();

  useEffect(() => {
    const userData = sessionStorage.getItem("aman_store_current_user");
    if (userData) {
      const u: UserType = JSON.parse(userData);
      if (u.role !== 'Student') {
        router.push("/dashboard");
      }
      setUser(u);
    } else {
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("aman_store_current_user");
    router.push("/");
  };

  if (!user) return null;

  // Resolve Student's Debtor profile and specific Ledger Account
  const studentDebtor = debtors.find(d => d.id === user.debtorId);
  const studentAccount = accounts.find(a => a.id === studentDebtor?.accountId);
  
  // Calculate specific entries for this student
  const studentTransactions = journalEntries.filter(entry => 
    entry.lines.some(line => line.accountId === studentAccount?.id)
  );

  const currentBalance = studentAccount?.balance || 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-20 sm:p-8">
      <div className="max-w-xl mx-auto space-y-6 mt-4">
        
        {/* Header & Logout */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Student Portal</h1>
            <p className="text-sm font-medium text-slate-500">{user.batch} Batch</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
          >
            <LogOut size={18} />
            <span className="text-xs font-bold hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center gap-5">
           <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
             <User size={30} />
           </div>
           <div>
             <h2 className="text-xl font-bold text-slate-800">{user.name}</h2>
             <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm mt-1">
               <Phone size={14} />
               <span>{user.phone}</span>
             </div>
           </div>
        </div>

        {/* Financial Overview Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Banknote size={120} className="-rotate-12" />
          </div>
          
          <div className="relative z-10">
            <p className="text-indigo-100 font-medium tracking-wide uppercase text-xs mb-1">Current Balance</p>
            <h3 className="text-5xl font-bold tracking-tight mb-2 flex items-baseline gap-2">
              ₹{Math.abs(currentBalance).toLocaleString()}
              <span className="text-lg font-medium text-indigo-200 uppercase">
                {currentBalance > 0 ? 'Due (Dr)' : currentBalance < 0 ? 'Advance (Cr)' : 'Settled'}
              </span>
            </h3>
            <p className="text-sm text-indigo-100/80 font-medium">
              {currentBalance > 0 
                ? "This is the amount you currently owe." 
                : currentBalance < 0 
                ? "You have this amount in advance." 
                : "Your account is fully settled!"}
            </p>
          </div>
        </div>

        {/* Transaction History Statement */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <History size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Your Statement</h3>
          </div>
          
          {studentTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-medium">
              No transactions recorded in your statement yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {studentTransactions.map(entry => {
                const line = entry.lines.find(l => l.accountId === studentAccount?.id);
                if (!line) return null;

                const isCredit = line.type === 'Credit'; // For asset, credit means they paid us (reduction of debt)
                
                return (
                  <div key={entry.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{entry.narration || "Entry"}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(entry.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isCredit ? '-' : '+'} ₹{line.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                        {isCredit ? 'Payment / Credit' : 'Charge / Debit'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
