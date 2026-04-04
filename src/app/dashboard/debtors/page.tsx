"use client";

import { Users, Search, Filter, Plus, ArrowDownCircle, ArrowUpCircle, X, User as UserIcon, Phone, KeyRound, CheckCircle2, Trash2 } from 'lucide-react';
import { useAccounting } from '@/lib/AccountingContext';
import { useState, useEffect, useMemo } from 'react';
import { Batch, User } from '@/lib/types';
import { useRouter } from 'next/navigation';

const BATCHES: Batch[] = ['JD1', 'JD2', 'HS1', 'HS2', 'BS1', 'BS2', 'BS3', 'BS4', 'BS5'];

export default function DebtorsPage() {
  const { debtors, accounts, addJournalEntry, deleteDebtor, addDebtor } = useAccounting();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<Batch | "All">("All");

  // Quick Actions State
  const [quickMode, setQuickMode] = useState<'None' | 'Debit' | 'Credit' | 'Register'>('None');
  const [qaStudentId, setQaStudentId] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBatch, setRegBatch] = useState<Batch | "">("");

  const [qaMsg, setQaMsg] = useState("");
  const [qaError, setQaError] = useState("");

  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (!userStr) { router.replace('/'); return; }
    const user: User = JSON.parse(userStr);
    if (user.role === 'Student') { router.replace('/profile'); return; }
    setCurrentUser(user);
  }, [router]);

  const filteredDebtors = useMemo(() => {
    return debtors.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                            d.mobileNumber.includes(search);
      const matchesBatch = batchFilter === "All" || d.batch === batchFilter;
      return matchesSearch && matchesBatch;
    });
  }, [debtors, search, batchFilter]);

  const handleDeleteDebtor = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (currentUser?.role !== "Admin") return;
    if (confirm(`Are you sure you want to permanently delete ${name}'s record and all access?`)) {
      // 1. Delete all accounting data (debtor record, ledger account, journal entries,
      //    and reverse ALL affected account balances) through the context so state stays consistent.
      deleteDebtor(id);

      // 2. Remove the associated student user from the users list (not in context).
      const usersStr = localStorage.getItem('aman_store_users');
      if (usersStr) {
        let uList: User[] = JSON.parse(usersStr);
        uList = uList.filter(u => u.debtorId !== id);
        localStorage.setItem('aman_store_users', JSON.stringify(uList));
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto pb-24 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pt-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Student Debtors</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage accounts and credit balances</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium shadow-sm transition-all"
          />
        </div>
        <div className="relative w-full sm:w-48 shrink-0">
          <Filter size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
          <select 
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value as Batch | "All")}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium shadow-sm appearance-none cursor-pointer"
          >
            <option value="All">All Batches</option>
            {BATCHES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border text-left border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        {filteredDebtors.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Users size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No students found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDebtors.map(debtor => {
              const acc = accounts.find(a => a.id === debtor.accountId);
              const balance = acc?.balance || debtor.currentBalance || 0;
              
              return (
                <div 
                  key={debtor.id} 
                  onClick={() => router.push(`/dashboard/debtors/${debtor.id}`)}
                  className="p-4 sm:px-6 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                      {debtor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                        {debtor.name}
                        {debtor.batch && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 uppercase tracking-wider">
                            {debtor.batch}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{debtor.mobileNumber}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className={`font-bold ${balance > 0 ? 'text-red-500' : balance < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        ₹{Math.abs(balance).toLocaleString()} {balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : ''}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Balance</p>
                    </div>
                    {currentUser?.role === 'Admin' && (
                      <button 
                        onClick={(e) => handleDeleteDebtor(e, debtor.id, debtor.name)}
                        className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors ml-2"
                        title="Delete Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setQuickMode('Debit')}
          className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-red-50 border-2 border-red-100 text-red-600 py-4 rounded-3xl transition-all shadow-sm group active:scale-[0.98]"
        >
          <ArrowUpCircle size={28} className="group-hover:-translate-y-1 transition-transform" />
          <span className="font-bold text-sm">Add Debit Amount</span>
        </button>
        <button 
          onClick={() => setQuickMode('Credit')}
          className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-emerald-50 border-2 border-emerald-100 text-emerald-600 py-4 rounded-3xl transition-all shadow-sm group active:scale-[0.98]"
        >
          <ArrowDownCircle size={28} className="group-hover:translate-y-1 transition-transform" />
          <span className="font-bold text-sm">Add Credit Amount</span>
        </button>
      </div>

      {/* Quick Action Modal */}
      {quickMode !== 'None' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative shrink-0">
              <h2 className={`font-bold ${quickMode === 'Debit' ? 'text-red-600' : quickMode === 'Credit' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {quickMode === 'Debit' ? 'Add Debit (Charge)' : quickMode === 'Credit' ? 'Add Credit (Payment)' : 'Register Student'}
              </h2>
              <button onClick={() => { setQuickMode('None'); setQaMsg(""); setQaError(""); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {qaMsg && <div className="mb-4 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl flex gap-2"><CheckCircle2 size={16}/>{qaMsg}</div>}
              {qaError && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl flex gap-2"><X size={16}/>{qaError}</div>}

              {(quickMode === 'Debit' || quickMode === 'Credit') && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!qaStudentId || !qaAmount || isNaN(Number(qaAmount))) {
                       setQaError("Please select a student and enter a valid amount.");
                       return;
                    }
                    const student = debtors.find(d => d.id === qaStudentId);
                    if (!student) return;
                    
                    const oppositeAccountId = quickMode === "Debit" ? "4" : "1"; 
                    addJournalEntry({
                       date: new Date().toISOString().split("T")[0],
                       narration: quickMode === "Debit" ? "Quick Charge Added" : "Quick Payment Received",
                       lf: "",
                       lines: [
                         { id: Math.random().toString(), accountId: student.accountId, type: quickMode, amount: Number(qaAmount) },
                         { id: Math.random().toString(), accountId: oppositeAccountId, type: quickMode === "Debit" ? "Credit" : "Debit", amount: Number(qaAmount) }
                       ],
                       createdBy: currentUser?.name || 'System'
                    });
                    
                    setQaAmount("");
                    setQaStudentId("");
                    setQaError("");
                    setQaMsg(`${quickMode} posted successfully!`);
                    setTimeout(() => setQaMsg(""), 3000);
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Student</label>
                    <select 
                      value={qaStudentId}
                      onChange={e => setQaStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-sm font-bold text-slate-800"
                    >
                      <option value="" disabled>--- Choose Student ---</option>
                      {debtors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.mobileNumber})</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount (₹)</label>
                    <input 
                      type="number" 
                      min="1"
                      step="0.01"
                      value={qaAmount}
                      onChange={e => setQaAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-xl font-black text-slate-800"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide mt-2 ${quickMode === 'Debit' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  >
                     Confirm {quickMode}
                  </button>
                  
                  <div className="pt-4 mt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 mb-2">Student not found?</p>
                    <button 
                      type="button"
                      onClick={() => { setQaError(""); setQaMsg(""); setQuickMode('Register'); }}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                    >
                      Register Here
                    </button>
                  </div>
                </form>
              )}

              {quickMode === 'Register' && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                     // Phone is optional — clean if provided
                     const rawPhone = regPhone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
                     const finalPhone = rawPhone.startsWith('91') && rawPhone.length === 12 ? rawPhone.slice(2) : rawPhone;
                     // Validate only mandatory fields
                     if (!regName.trim() || !regBatch || !regPassword.trim()) {
                        setQaError("Please fill Name, Batch and Password."); return;
                     }
                     // If phone provided, enforce 10 digits
                     if (finalPhone && !/^[0-9]{10}$/.test(finalPhone)) {
                       setQaError("Phone must be exactly 10 digits if provided."); return;
                     }
                     const usersStr = localStorage.getItem('aman_store_users');
                     const users: User[] = usersStr ? JSON.parse(usersStr) : [];
                     // Check duplicate phone only if phone was entered
                     if (finalPhone && users.find(u => u.phone === finalPhone)) {
                         setQaError("Phone number already registered."); return;
                     }
                    
                     // Use context addDebtor (creates ledger account + debtor atomically)
                     const newDebtor = addDebtor({
                       name: regName.trim(),
                       mobileNumber: finalPhone,
                       batch: regBatch as Batch,
                     });

                     // Save the student user login to localStorage
                     const timestamp = Date.now().toString();
                     const newUser: User = {
                       id: `student_${timestamp}`,
                       phone: finalPhone,
                       password: regPassword.trim(),
                       name: regName.trim(),
                       role: 'Student',
                       batch: regBatch as Batch,
                       debtorId: newDebtor.id
                     };
                     users.push(newUser);
                     localStorage.setItem('aman_store_users', JSON.stringify(users));

                     // Reset form and close modal — student appears in list immediately
                     setRegName(''); setRegPhone(''); setRegPassword(''); setRegBatch('');
                     setQaError('');
                     setQaMsg(`✓ ${regName.trim()} registered successfully!`);
                     setTimeout(() => { setQaMsg(''); setQuickMode('None'); }, 2000);
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="text" value={regName} onChange={e => setRegName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch</label>
                    <select
                      value={regBatch} onChange={(e) => setRegBatch(e.target.value as Batch)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                    >
                      <option value="" disabled>Select your batch</option>
                      {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone <span className="normal-case text-[9px] text-slate-400 font-normal">(optional)</span></label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                       <input 
                         type="tel" inputMode="numeric" value={regPhone} onChange={e => setRegPhone(e.target.value)}
                         maxLength={10}
                         className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                         placeholder="10-digit mobile (optional)"
                       />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</label>
                    <div className="relative">
                      <KeyRound size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input 
                        type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold text-sm tracking-wide mt-4"
                  >
                    Register Student
                  </button>
                  
                  <div className="pt-2 text-center">
                    <button 
                      type="button"
                      onClick={() => setQuickMode('Debit')}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
