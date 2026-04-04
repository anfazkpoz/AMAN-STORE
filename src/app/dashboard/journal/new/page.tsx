"use client";

import React, { useState } from 'react';
import { useAccounting } from '@/lib/AccountingContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { JournalLine, AccountType, User } from '@/lib/types';
import { useEffect } from 'react';

export default function NewJournalEntryPage() {
  const { accounts, debtors, addJournalEntry, addAccount, addDebtor } = useAccounting();
  const router = useRouter();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [lf, setLf] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: '1', accountId: '', type: 'Debit', amount: 0 },
    { id: '2', accountId: '', type: 'Credit', amount: 0 }
  ]);
  const [error, setError] = useState('');

  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  // Add Account Modal State
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('Asset');
  const [newAccBalanceType, setNewAccBalanceType] = useState<'Debit' | 'Credit'>('Debit');

  // Add Debtor Modal State
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtorPhone, setNewDebtorPhone] = useState('');

  const handleLineChange = (id: string, field: keyof JournalLine, value: string | number) => {
    setLines(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now().toString(), accountId: '', type: 'Debit', amount: 0 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) return; // Minimum 2 lines required for double entry
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const totalDebit = lines.filter(l => l.type === 'Debit').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalCredit = lines.filter(l => l.type === 'Credit').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!isBalanced) {
      setError(`Cannot post entry: Total Debit (₹${totalDebit}) must equal Total Credit (₹${totalCredit}).`);
      return;
    }
    if (lines.some(l => !l.accountId || Number(l.amount) <= 0)) {
      setError("All lines must have an account selected and amount > 0.");
      return;
    }
    if (!narration.trim()) {
      setError("Narration is required.");
      return;
    }

    addJournalEntry({
      date,
      narration,
      lf,
      lines: lines.map(l => ({ ...l, amount: Number(l.amount) })),
      createdBy: currentUser?.name || 'System'
    });

    router.push('/dashboard/journal');
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    const newAcc = addAccount({
      name: newAccName,
      type: newAccType,
      balanceType: newAccBalanceType
    });
    if (activeLineId) handleLineChange(activeLineId, 'accountId', newAcc.id);
    setNewAccName('');
    setShowAddAccount(false);
    setActiveLineId(null);
  };

  const handleAddDebtor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtorName.trim()) return;
    const newDebtorObj = addDebtor({
      name: newDebtorName,
      mobileNumber: newDebtorPhone,
    });
    if (activeLineId) handleLineChange(activeLineId, 'accountId', newDebtorObj.accountId);
    setNewDebtorName('');
    setNewDebtorPhone('');
    setShowAddDebtor(false);
    setActiveLineId(null);
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pt-4">
        <Link href="/dashboard/journal" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New Journal Entry</h1>
          <p className="text-sm text-slate-500">Record a standard double-entry transaction</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          
          {/* Header Fields (Date, LF) */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 gap-4">
            <div className="space-y-1.5 focus-within:text-primary">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium"
                required
              />
            </div>
            
            <div className="space-y-1.5 focus-within:text-primary">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">L.F (Ledger Folio)</label>
              <input 
                type="text" 
                value={lf}
                onChange={(e) => setLf(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium"
              />
            </div>
          </div>

          {/* Dynamic Lines */}
          <div className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-4">Particulars</h3>
            
            {lines.map((line) => (
              <div key={line.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative group">
                {lines.length > 2 && (
                  <button 
                    type="button" 
                    onClick={() => removeLine(line.id)}
                    className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                
                <div className="grid grid-cols-[1fr_auto] gap-3 mb-3">
                  <select 
                    value={line.accountId}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ADD_ACCOUNT') {
                        setActiveLineId(line.id);
                        setShowAddAccount(true);
                      } else if (val === 'ADD_DEBTOR') {
                        setActiveLineId(line.id);
                        setShowAddDebtor(true);
                      } else {
                        handleLineChange(line.id, 'accountId', val);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-medium appearance-none"
                    required
                  >
                    <option value="" disabled>Select Account Head</option>
                    <optgroup label="Quick Actions">
                      <option value="ADD_ACCOUNT" className="text-primary font-semibold">+ Create New Account</option>
                      <option value="ADD_DEBTOR" className="text-primary font-semibold">+ Create New Debtor</option>
                    </optgroup>
                    
                    {debtors.length > 0 && (
                      <optgroup label="Debtors (Customers)">
                        {debtors.map(d => (
                          <option key={d.id} value={d.accountId}>{d.name} (Debtor)</option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="General Accounts">
                      {accounts.filter(a => !debtors.some(d => d.accountId === a.id)).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                      ))}
                    </optgroup>
                  </select>
                  
                  <div className="flex bg-slate-200/60 p-1 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => handleLineChange(line.id, 'type', 'Debit')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${line.type === 'Debit' ? 'bg-white shadow-sm text-foreground' : 'text-slate-500'}`}
                    >
                      Dr
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleLineChange(line.id, 'type', 'Credit')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${line.type === 'Credit' ? 'bg-white shadow-sm text-foreground' : 'text-slate-500'}`}
                    >
                      Cr
                    </button>
                  </div>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={line.amount || ''}
                    onChange={(e) => handleLineChange(line.id, 'amount', e.target.value)}
                    placeholder="Amount"
                    className={`w-full pl-8 pr-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium ${
                      line.type === 'Debit' ? 'border-blue-200 text-blue-700' : 'border-emerald-200 text-emerald-700'
                    }`}
                    required
                  />
                </div>
              </div>
            ))}

            <button 
              type="button" 
              onClick={addLine}
              className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 font-medium rounded-2xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} /> Add Line Item
            </button>
          </div>

          {/* Balance Indicator & Narration */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 space-y-4">
            
            {/* Realtime Balance Status */}
            <div className={`p-4 rounded-xl flex items-center justify-between border ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              <div className="flex items-center gap-2 font-semibold">
                {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {isBalanced ? 'Entry Balanced' : 'Mismatch'}
              </div>
              <div className="text-right text-xs space-y-1 font-medium font-mono">
                <div>Dr: ₹{totalDebit.toFixed(2)}</div>
                <div>Cr: ₹{totalCredit.toFixed(2)}</div>
              </div>
            </div>

            <div className="space-y-1.5 focus-within:text-primary">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">Narration</label>
              <textarea 
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Being business started with cash..."
                rows={2}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium resize-none"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-6 pt-2">
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={!isBalanced || lines.length < 2}
              className="w-full py-4 rounded-2xl font-bold tracking-wide text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
            >
              Post to Ledger
            </button>
          </div>

        </form>
      </div>

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">New Account Head</h2>
              <button onClick={() => setShowAddAccount(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white rounded-full shadow-sm">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account Name</label>
                <input 
                  type="text"
                  value={newAccName}
                  onChange={e => setNewAccName(e.target.value)}
                  placeholder="e.g. Rent A/c"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account Type</label>
                <select 
                  value={newAccType}
                  onChange={e => setNewAccType(e.target.value as AccountType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium appearance-none"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Normal Balance</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setNewAccBalanceType('Debit')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all border ${newAccBalanceType === 'Debit' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    Debit (Dr)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewAccBalanceType('Credit')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all border ${newAccBalanceType === 'Credit' ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                  >
                    Credit (Cr)
                  </button>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 mt-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Debtor Modal */}
      {showAddDebtor && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">New Debtor Profile</h2>
              <button 
                onClick={() => { setShowAddDebtor(false); setActiveLineId(null); }} 
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-white rounded-full shadow-sm"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDebtor} className="p-6 space-y-4">
              <div className="space-y-1.5 focus-within:text-primary">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">Debtor Name</label>
                <input 
                  type="text"
                  value={newDebtorName}
                  onChange={e => setNewDebtorName(e.target.value)}
                  placeholder="e.g. Acme Corp / John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5 focus-within:text-primary">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors">Mobile Number</label>
                <input 
                  type="tel"
                  value={newDebtorPhone}
                  onChange={e => setNewDebtorPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-medium"
                />
              </div>
              
              <div className="p-3 mt-2 bg-blue-50/50 text-blue-700 text-xs border border-blue-100 rounded-xl">
                A new Asset account named <strong>&quot;{newDebtorName || 'Name'}&quot; A/c</strong> will be created automatically to track this debtor&apos;s ledger balance.
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 mt-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Create Debtor
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
