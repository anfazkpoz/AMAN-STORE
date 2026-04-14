"use client";
import { Users, Search, Filter, Plus, ArrowDownCircle, ArrowUpCircle, X, User as UserIcon, Phone, KeyRound, CheckCircle2, Trash2, Eye, EyeOff, Pencil, MessageCircle } from 'lucide-react';
import { useAccounting } from '@/lib/AccountingContext';
import { useState, useEffect, useMemo } from 'react';
import { Batch, User, Debtor } from '@/lib/types';
import { useRouter } from 'next/navigation';

const BATCHES: Batch[] = ['JD1', 'JD2', 'JD3', 'HS1', 'HS2', 'BS1', 'BS2', 'BS3', 'BS4', 'BS5'];

export default function DebtorsPage() {
  const { debtors, accounts, addJournalEntry, deleteDebtor, updateDebtor, reloadData } = useAccounting();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<Batch | "All">("All");

  // Edit State
  const [editingDebtor, setEditingDebtor] = useState<Debtor | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBatch, setEditBatch] = useState<Batch | "">("");

  // Quick Actions State
  const [quickMode, setQuickMode] = useState<'None' | 'Debit' | 'Credit' | 'Register'>('None');
  const [prevQuickMode, setPrevQuickMode] = useState<'Debit' | 'Credit'>('Credit');
  const [qaStudentId, setQaStudentId] = useState("");
  const [qaAmount, setQaAmount] = useState("");
  const [qaOppositeAccount, setQaOppositeAccount] = useState<'cash' | 'bank'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBatch, setRegBatch] = useState<Batch | "">("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [qaMsg, setQaMsg] = useState("");
  const [qaError, setQaError] = useState("");

  // Notice: Push notification state removed for WhatsApp replace
  // Student Search in Modal
  const [modalBatch, setModalBatch] = useState<Batch | "">("");
  const [modalSearch, setModalSearch] = useState("");

  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (!userStr) { router.replace('/'); return; }
    const user: User = JSON.parse(userStr);
    if (user.role === 'Student') { router.replace('/profile'); return; }
    setCurrentUser(user);
  }, [router]);

  const filteredDebtors = useMemo(() => {
    return [...debtors]
      .filter(d => {
        const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || 
                              d.mobileNumber.includes(search);
        const matchesBatch = batchFilter === "All" || d.batch === batchFilter;
        return matchesSearch && matchesBatch;
      })
      .sort((a, b) => {
        const idxA = a.batch ? BATCHES.indexOf(a.batch) : -1;
        const idxB = b.batch ? BATCHES.indexOf(b.batch) : -1;
        if (idxA !== idxB) return idxA - idxB;
        return a.name.localeCompare(b.name);
      });
  }, [debtors, search, batchFilter]);

  const handleDeleteDebtor = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (currentUser?.role !== "Admin") return;
    if (confirm(`Are you sure you want to permanently delete ${name}'s record and all access?`)) {
      // 1. Delete the debtor/student and all associated data via the context/API
      await deleteDebtor(id);
      
      // 2. Fetch the user associated with this debtor to delete them from MongoDB if role matches
      try {
        const usersRes = await fetch('/api/users?role=Student');
        if (usersRes.ok) {
          const users: User[] = await usersRes.json();
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
    }
  };

  const handleWhatsAppReminder = (e: React.MouseEvent, debtor: Debtor, balance: number) => {
    e.stopPropagation();
    const msg = encodeURIComponent(`Hi ${debtor.name}, this is a gentle reminder from AMAN STORE. Your current pending balance is ₹${Math.abs(balance).toLocaleString()}. Please clear it at the earliest.`);
    const number = debtor.mobileNumber?.replace(/[^0-9]/g, '') || '';
    const waNumber = number.length === 10 ? `91${number}` : number;
    
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank');
    } else {
      alert("No valid phone number available for this student.");
    }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setQaError("");
    
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

    setIsSubmitting(true);
    try {
      // Direct call to users API which handles account and debtor creation for us
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          phone: finalPhone || `student_${Date.now()}`, // Fallback if phone is empty
          password: regPassword.trim(),
          role: 'Student',
          batch: regBatch as Batch
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        setQaError(errData.error || "Registration failed.");
        return;
      }

      await reloadData();
      setRegName(''); setRegPhone(''); setRegPassword(''); setRegBatch('');
      setQaError('');
      setQaMsg(`✓ ${regName.trim()} registered successfully!`);
      setTimeout(() => { setQaMsg(''); setQuickMode(prevQuickMode); }, 2000);
    } catch (err: any) {
      setQaError(err.message || "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-0 max-w-4xl mx-auto pb-44 sm:pb-32 relative min-h-screen">

      {/* Sticky Header - Fixes search and filter at the top */}
      <div className="sticky top-0 z-[45] bg-slate-50/95 backdrop-blur-md px-4 sm:px-8 py-6 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Student Debtors</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Manage accounts and credit balances</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
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
      </div>

      <div className="px-4 sm:px-8 mt-6">

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
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                      {debtor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 flex items-center gap-2 group-hover:text-indigo-600 transition-colors truncate">
                        <span className="truncate">{debtor.name}</span>
                        {debtor.batch && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 uppercase tracking-wider shrink-0">
                            {debtor.batch}
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{debtor.mobileNumber || "No Phone"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      {balance > 0 ? (
                        <p className="font-bold text-red-600 text-sm sm:text-base">
                          ₹{balance.toLocaleString()}
                        </p>
                      ) : balance < 0 ? (
                        <p className="font-bold text-emerald-600 text-sm sm:text-base">
                          ₹{Math.abs(balance).toLocaleString()}
                        </p>
                      ) : (
                        <p className="font-bold text-slate-400 text-sm sm:text-base">
                          ₹0
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium uppercase mt-0">Balance</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Send WhatsApp Reminder — shown when student has a balance */}
                      {balance > 0 && (
                        <button
                          onClick={(e) => handleWhatsAppReminder(e, debtor, balance)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-full transition-colors"
                          title="Send WhatsApp Reminder"
                        >
                          <MessageCircle size={18} />
                        </button>
                      )}
                      {currentUser?.role === 'Admin' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDebtor(debtor);
                            setEditName(debtor.name);
                            setEditPhone(debtor.mobileNumber);
                            setEditBatch(debtor.batch || "");
                          }}
                          className="p-2 text-slate-300 hover:bg-slate-100 hover:text-primary rounded-full transition-colors hidden sm:flex"
                          title="Edit Student"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {currentUser?.role === 'Admin' && (
                        <button 
                          onClick={(e) => handleDeleteDebtor(e, debtor.id, debtor.name).catch(console.error)}
                          className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors hidden sm:flex"
                          title="Delete Student"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </div>

      {/* Fixed Footer - Perfectly centered in the content area */}
      <div className="fixed bottom-24 md:bottom-8 md:pl-64 left-0 right-0 z-[45] flex justify-center pointer-events-none">
        <div className="w-full max-w-4xl px-4 sm:px-8 grid grid-cols-2 gap-4 pointer-events-auto">
          <button 
            onClick={() => setQuickMode('Debit')}
            className="flex flex-col items-center justify-center gap-2 bg-white/95 backdrop-blur hover:bg-white border-2 border-red-50 text-red-600 py-3.5 rounded-2xl transition-all shadow-xl group active:scale-[0.98] ring-1 ring-black/[0.03]"
          >
            <ArrowUpCircle size={24} className="group-hover:-translate-y-1 transition-transform" />
            <span className="font-bold text-[12px] uppercase tracking-wide">Add Debit</span>
          </button>
          <button 
            onClick={() => setQuickMode('Credit')}
            className="flex flex-col items-center justify-center gap-2 bg-white/95 backdrop-blur hover:bg-white border-2 border-emerald-50 text-emerald-600 py-3.5 rounded-2xl transition-all shadow-xl group active:scale-[0.98] ring-1 ring-black/[0.03]"
          >
            <ArrowDownCircle size={24} className="group-hover:translate-y-1 transition-transform" />
            <span className="font-bold text-[12px] uppercase tracking-wide">Add Credit</span>
          </button>
        </div>
      </div>

      {quickMode !== 'None' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative shrink-0">
              <h2 className={`font-bold ${quickMode === 'Debit' ? 'text-red-600' : quickMode === 'Credit' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                {quickMode === 'Debit' ? 'Add Debit (Charge)' : quickMode === 'Credit' ? 'Add Credit (Payment)' : 'Register Student'}
              </h2>
              <button onClick={() => { setQuickMode('None'); setQaMsg(""); setQaError(""); setModalSearch(""); setModalBatch(""); }} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {qaMsg && <div className="mb-4 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl flex gap-2"><CheckCircle2 size={16}/>{qaMsg}</div>}
              {qaError && <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-xl flex gap-2"><X size={16}/>{qaError}</div>}

              {(quickMode === 'Debit' || quickMode === 'Credit') && (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (isSubmitting) return;
                    if (!qaStudentId || !qaAmount || isNaN(Number(qaAmount)) || Number(qaAmount) <= 0) {
                       setQaError("Please select a student and enter a valid amount.");
                       return;
                    }
                    const student = debtors.find(d => d.id === qaStudentId);
                    if (!student) return;
                    
                    let selectedOppAcc: any = null;

                    if (quickMode === 'Credit') {
                      // Find Cash or Bank account dynamically by name (flexible keyword search)
                      const cashKeywords = ['cash'];
                      const bankKeywords = ['bank', 'hdfc', 'sbi', 'icici', 'axis', 'federal', 'canara', 'kotak'];
                      const cashAcc = accounts.find(a => {
                        const n = a.name?.toLowerCase() || '';
                        return cashKeywords.some(k => n.includes(k));
                      });
                      const bankAcc = accounts.find(a => {
                        const n = a.name?.toLowerCase() || '';
                        return bankKeywords.some(k => n.includes(k));
                      });
                      selectedOppAcc = qaOppositeAccount === 'cash' ? cashAcc : bankAcc;

                      if (!selectedOppAcc) {
                        const available = accounts.map(a => `"${a.name}"`).join(', ');
                        setQaError(`No ${qaOppositeAccount === 'cash' ? 'Cash' : 'Bank'} account found. Available: ${available || 'none'}`);
                        return;
                      }
                    } else {
                      // Logic for Debit
                      const incomeKeywords = ['sales', 'fees', 'income', 'revenue'];
                      selectedOppAcc = accounts.find(a => {
                        const n = a.name?.toLowerCase() || '';
                        return incomeKeywords.some(k => n.includes(k));
                      });

                      if (!selectedOppAcc) {
                        setQaError(`No Sales or Fees account found. Please create one in accounts to record charges.`);
                        return;
                      }
                    }

                    setIsSubmitting(true);
                    try {
                      let narration = "";
                      let msg = "";
                      if (quickMode === "Debit") {
                        narration = `Student Charge (Fees/Sales)`;
                        msg = `✓ Debit posted successfully!`;
                      } else {
                        narration = `Quick Payment via ${qaOppositeAccount === 'cash' ? 'Cash' : 'Bank'}`;
                        msg = `✓ Credit posted successfully via ${qaOppositeAccount === 'cash' ? 'Cash' : 'Bank'}!`;
                      }

                      await addJournalEntry({
                         date: new Date().toISOString().split("T")[0],
                         narration,
                         lf: "",
                         lines: [
                           { id: Math.random().toString(), accountId: student.accountId, type: quickMode, amount: Number(qaAmount) },
                           { id: Math.random().toString(), accountId: selectedOppAcc.id, type: quickMode === "Debit" ? "Credit" : "Debit", amount: Number(qaAmount) }
                         ],
                         createdBy: currentUser?.name || 'System'
                      });
                      
                      setQaAmount("");
                      setQaStudentId("");
                      setQaError("");
                      setModalSearch("");
                      setModalBatch("");
                      setQaMsg(msg);
                      setTimeout(() => setQaMsg(""), 3000);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Student</label>
                    <div className="relative">
                       <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Search Student..." 
                         value={modalSearch}
                         onChange={e => setModalSearch(e.target.value)}
                         className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-sm font-bold text-slate-800"
                       />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-hide">
                      <button 
                        type="button"
                        onClick={() => setModalBatch("")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${modalBatch === "" ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        ALL
                      </button>
                      {BATCHES.map(b => (
                        <button 
                          key={b}
                          type="button"
                          onClick={() => setModalBatch(b)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors ${modalBatch === b ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                    <select 
                      value={qaStudentId}
                      onChange={e => setQaStudentId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-sm font-bold text-slate-800 mt-2"
                    >
                      <option value="">--- Choose Student ---</option>
                      {debtors
                        .filter(d => {
                          const matchesBatch = !modalBatch || d.batch === modalBatch;
                          const matchesSearch = d.name.toLowerCase().includes(modalSearch.toLowerCase()) || d.mobileNumber?.includes(modalSearch);
                          return matchesBatch && matchesSearch;
                        })
                        .sort((a,b) => a.name.localeCompare(b.name))
                        .map(d => <option key={d.id} value={d.id}>{d.name} ({d.batch || '?'})</option>)
                      }
                    </select>
                  </div>

                  {/* Cash / Bank selector - Only for Credit */}
                  {quickMode === 'Credit' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Dr. A/C (Received In)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setQaOppositeAccount('cash')}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          qaOppositeAccount === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        💵 Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setQaOppositeAccount('bank')}
                        className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                          qaOppositeAccount === 'bank'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        🏦 Bank
                      </button>
                    </div>
                  </div>
                  )}
                  
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
                    disabled={isSubmitting}
                    className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide mt-2 transition-all ${
                      isSubmitting
                        ? 'opacity-60 cursor-not-allowed bg-slate-400'
                        : quickMode === 'Debit' ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? 'Saving...' : `Confirm ${quickMode}`}
                  </button>
                  
                  {quickMode === 'Credit' && (
                  <div className="pt-4 mt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 mb-2">Student not found?</p>
                    <button 
                      type="button"
                      onClick={() => { setQaError(""); setQaMsg(""); setPrevQuickMode(quickMode as 'Debit' | 'Credit'); setQuickMode('Register'); }}
                      className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                    >
                      Register Here
                    </button>
                  </div>
                  )}
                </form>
              )}

              {quickMode === 'Register' && (
                <form onSubmit={handleQuickRegister} className="space-y-3">
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
                        type={showRegPassword ? "text" : "password"} value={regPassword} onChange={e => setRegPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 text-white rounded-xl shadow-md font-bold text-sm tracking-wide mt-4 transition-all ${
                      isSubmitting ? 'bg-slate-400 cursor-not-allowed opacity-60' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                    }`}
                  >
                    {isSubmitting ? 'Registering...' : 'Register Student'}
                  </button>
                  
                  <div className="pt-2 text-center">
                    <button 
                      type="button"
                      onClick={() => { setQaError(""); setQaMsg(""); setQuickMode(prevQuickMode); }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      ← Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {editingDebtor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">Edit Student Profile</h2>
              <button 
                onClick={() => setEditingDebtor(null)} 
                className="p-2 text-slate-400 hover:bg-slate-200 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await updateDebtor({ ...editingDebtor, name: editName, mobileNumber: editPhone, batch: editBatch as Batch });
                setEditingDebtor(null);
                await reloadData();
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <input 
                  type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Batch</label>
                <select
                  value={editBatch} onChange={(e) => setEditBatch(e.target.value as Batch)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                >
                  {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                <input 
                  type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-semibold"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold text-sm tracking-wide mt-2"
              >
                Update Profile
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
