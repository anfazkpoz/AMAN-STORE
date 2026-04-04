"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useParams, useRouter } from "next/navigation";
import { useAccounting } from "@/lib/AccountingContext";
import { ArrowLeft, User, Phone, CheckCircle2, History, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/formatDate";
import { useState, useEffect } from "react";
import { User as UserType, Debtor } from "@/lib/types";

export default function StudentLedgerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { debtors, accounts, journalEntries, addJournalEntry, deleteDebtor, reloadData } = useAccounting();

  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [narration, setNarration] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"Debit" | "Credit">("Debit"); // Student asset: Debit = Charge Student, Credit = Student Pays Us
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const studentDebtor = debtors.find(d => d.id === id);
  const studentAccount = accounts.find(a => a.id === studentDebtor?.accountId);

  if (!studentDebtor || !studentAccount) {
    return (
      <div className="p-8 text-center pt-24 text-slate-500 font-medium animate-pulse">
        Locating student ledger...
      </div>
    );
  }

  const studentTransactions = journalEntries.filter(entry => 
    entry.lines.some(line => line.accountId === studentAccount.id)
  );

  const currentBalance = studentAccount.balance;

  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    // "Sales A/c" or "Revenue" is typically credited when Debt is debited
    // "Cash A/c" is typically debited when Debt is credited (Student makes payment)
    const oppositeAccountId = type === "Debit" ? "4" : "1"; 
    
    await addJournalEntry({
      date,
      narration: narration || (type === "Debit" ? "Goods/Services Sold" : "Payment Received"),
      lf: "",
      lines: [
        { id: Math.random().toString(), accountId: studentAccount.id, type: type, amount: Number(amount) },
        { id: Math.random().toString(), accountId: oppositeAccountId, type: type === "Debit" ? "Credit" : "Debit", amount: Number(amount) }
      ],
      createdBy: currentUser?.name || 'System'
    });

    setAmount("");
    setNarration("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleDelete = async () => {
    if (currentUser?.role !== "Admin") return;
    if (confirm(`Are you sure you want to permanently delete ${studentDebtor.name}'s record and transactions?`)) {
      // 1. Delete the debtor/student and all associated data via the context/API
      await deleteDebtor(id);
      
      // 2. Fetch the user associated with this debtor to delete them from MongoDB
      try {
        const usersRes = await fetch('/api/users?role=Student');
        if (usersRes.ok) {
          const users: UserType[] = await usersRes.json();
          const targetUser = users.find(u => u.debtorId === id);
          if (targetUser) {
            await fetch('/api/users', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: (targetUser as any)._id })
            });
          }
        }
      } catch (err) {
        console.error("Failed to clean up user record:", err);
      }
      
      await reloadData();
      router.push("/dashboard/debtors");
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24 relative space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm"
        >
          <ArrowLeft size={16} /> Back to Debtors
        </button>
        {currentUser?.role === "Admin" && (
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>

      {/* Identity Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 select-none font-bold text-xl">
             {studentDebtor.name.charAt(0).toUpperCase()}
           </div>
           <div>
             <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
               {studentDebtor.name}
               <span className="px-2 py-0.5 rounded bg-indigo-50 text-[10px] text-indigo-600 uppercase tracking-wider font-bold">
                 {studentDebtor.batch}
               </span>
             </h1>
             <div className="flex items-center gap-1.5 text-slate-500 font-medium text-sm mt-1">
               <Phone size={14} />
               <span>{studentDebtor.mobileNumber || "No Phone"}</span>
             </div>
           </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 rounded-2xl sm:text-right border border-slate-100 min-w-[200px]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ledger Balance</p>
          <p className={`text-2xl font-black ${currentBalance > 0 ? 'text-red-500' : currentBalance < 0 ? 'text-emerald-500' : 'text-slate-800'}`}>
            ₹{Math.abs(currentBalance).toLocaleString()} 
            <span className="text-sm font-bold ml-1">{currentBalance > 0 ? 'Dr' : currentBalance < 0 ? 'Cr' : ''}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction Entry Form */}
        <div className="lg:col-span-1 border border-slate-200 bg-white rounded-3xl p-6 shadow-sm self-start">
          <h2 className="text-lg font-bold text-slate-800 mb-4 tracking-tight border-b border-slate-100 pb-4">Post Transaction</h2>
          
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} />
              <p className="font-bold text-xs">Transaction Posted!</p>
            </div>
          )}

          <form onSubmit={handlePostTransaction} className="space-y-4">
            <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transaction Date</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm font-bold text-slate-800"
                required
              />
            </div>

            <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Entry Type</label>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setType("Debit")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'Debit' ? 'bg-white shadow-sm text-red-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  DEBIT (Charge)
                </button>
                <button
                  type="button"
                  onClick={() => setType("Credit")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'Credit' ? 'bg-white shadow-sm text-emerald-600 border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  CREDIT (Payment)
                </button>
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
              <input 
                type="number" 
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm font-bold text-slate-800"
                placeholder="e.g. 500"
                required
              />
            </div>

            <div className="space-y-1.5 focus-within:text-indigo-600 transition-colors">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Narration / Details</label>
              <input 
                type="text" 
                value={narration}
                onChange={e => setNarration(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-sm font-bold text-slate-800"
                placeholder={type === 'Debit' ? "e.g. Monthly Fees" : "e.g. Cash Payment"}
              />
            </div>

            <button 
              type="submit" 
              className={`w-full py-3 rounded-xl transition-all shadow-md text-white font-bold text-sm tracking-wide flex justify-center items-center gap-2 active:scale-[0.98] ${type === 'Debit' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}
            >
              Post {type} Entry
            </button>
          </form>
        </div>

        {/* Ledger Statement View */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <History size={20} className="text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Ledger Statement</h3>
            </div>
          </div>
          
          {studentTransactions.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-sm font-medium">
              No transactions recorded for this student yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {studentTransactions.map(entry => {
                const line = entry.lines.find(l => l.accountId === studentAccount?.id);
                if (!line) return null;

                const isCredit = line.type === 'Credit'; 
                
                return (
                  <div key={entry.id} className="p-5 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{entry.narration || "Entry"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-400 font-medium">{formatDate(entry.date)}</p>
                        {currentUser?.role === 'Admin' && entry.createdBy && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            By {entry.createdBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isCredit ? '-' : '+'} ₹{line.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                        {isCredit ? 'Payment (Cr)' : 'Charge (Dr)'}
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
