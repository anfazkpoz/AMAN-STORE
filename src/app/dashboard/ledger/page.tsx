"use client";

import { useAccounting } from '@/lib/AccountingContext';
import { formatDate } from '@/lib/formatDate';
import { Library, ArrowLeft, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

export default function LedgerPage() {
  const { accounts, journalEntries, deleteJournalEntry, deleteAccount } = useAccounting();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);

  // System default accounts that should NOT be deletable
  const PROTECTED_IDS = ['1', '2', '3', '4', '5'];

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // Compute transactions for the selected account using useMemo
  const transactions = React.useMemo(() => {
    if (!selectedAccountId) return [];

    const computed = journalEntries
      .filter((entry: any) => entry.lines.some((l: any) => l.accountId === selectedAccountId))
      .sort((a: any, b: any) => a.createdAt - b.createdAt) // Ascending chronological for a ledger
      .flatMap((entry: any) => {
        const matchingLines = entry.lines.filter((l: any) => l.accountId === selectedAccountId);

        return matchingLines.map((accLine: any) => {
          const oppositeLines = entry.lines.filter((l: any) => l.type !== accLine.type);
          let particulars = "";

          if (oppositeLines.length === 0) {
            particulars = "Unknown/Unbalanced Entry";
          } else if (oppositeLines.length === 1) {
            const oppAcc = accounts.find((a: any) => a.id === oppositeLines[0].accountId);
            particulars = oppAcc ? oppAcc.name : "Unknown A/c";
          } else {
            particulars = "Sundries";
          }

          const prefix = accLine.type === 'Debit' ? "To " : "By ";
          
          return {
            id: `${entry.id}-${accLine.id}`, // Guaranteed unique key for iteration
            entryId: entry.id, // raw journal entry id for deletion
            date: formatDate(entry.date),
            particulars: prefix + particulars,
            narration: entry.narration,
            lf: entry.lf,
            type: accLine.type,
            amount: accLine.amount
          };
        });
      });

    let runningBalance = 0;
    const isDebitNormal = selectedAccount?.balanceType === 'Debit';

    return computed.map((t: any) => {
      if (t.type === 'Debit') {
        runningBalance += isDebitNormal ? t.amount : -t.amount;
      } else {
        runningBalance += isDebitNormal ? -t.amount : t.amount;
      }
      return { ...t, balance: runningBalance };
    });
  }, [selectedAccountId, journalEntries, accounts, selectedAccount?.balanceType]);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {!selectedAccountId ? (
              <Library size={24} className="text-primary" />
            ) : (
              <button 
                onClick={() => setSelectedAccountId('')} 
                className="p-1.5 -ml-2 bg-white rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors mr-1 cursor-pointer z-10"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
            )}
            {!selectedAccountId ? 'General Ledger' : 'Account Statement'}
          </h1>
          <p className="text-sm text-slate-500">
            {!selectedAccountId ? 'Select an account to view its statement' : 'View full chronological transactions'}
          </p>
        </div>
        
        {selectedAccountId && (
          <div className="flex-1 max-w-sm animate-in fade-in duration-300">
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-semibold appearance-none shadow-sm cursor-pointer"
            >
              <option value="" disabled>Switch Ledger Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedAccountId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-300">
          {accounts.map(acc => {
            const isAbnormal = acc.balance < 0;
            const sign = isAbnormal 
              ? (acc.balanceType === 'Debit' ? 'Cr' : 'Dr')
              : (acc.balanceType === 'Debit' ? 'Dr' : 'Cr');
            const absBal = Math.abs(acc.balance);
            const isProtected = PROTECTED_IDS.includes(acc.id);
            const isConfirming = confirmDeleteAccountId === acc.id;

            return (
              <div
                key={acc.id}
                className={`relative group bg-white rounded-3xl shadow-sm border transition-all flex flex-col justify-between min-h-[140px] overflow-hidden ${
                  isConfirming
                    ? 'border-red-300 shadow-red-100 bg-red-50/30'
                    : 'border-slate-200 hover:border-primary hover:shadow-md'
                }`}
              >
                {/* Left accent bar */}
                <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${
                  isConfirming ? 'bg-red-400' : 'bg-slate-200 group-hover:bg-primary'
                }`} />

                {/* Clickable card body */}
                <button
                  onClick={() => !isConfirming && setSelectedAccountId(acc.id)}
                  className="text-left p-6 flex flex-col justify-between h-full w-full"
                >
                  <div>
                    <h3 className={`text-lg font-bold mb-1 pr-8 transition-colors ${
                      isConfirming ? 'text-red-700' : 'text-slate-800 group-hover:text-primary'
                    }`}>{acc.name}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 inline-block px-2 py-1 rounded-md mb-4">{acc.type}</p>
                  </div>
                  <div className="flex justify-between items-end w-full mt-auto">
                    <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Balance</span>
                    <span className={`text-xl font-mono font-bold tracking-tight ${
                      isConfirming ? 'text-red-600' : sign === 'Dr' ? 'text-indigo-600' : 'text-emerald-600'
                    }`}>
                      ₹{absBal.toFixed(2)}
                      <span className="text-xs ml-1 opacity-70 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 inline-block">{sign}</span>
                    </span>
                  </div>
                </button>

                {/* Delete control — top-right corner */}
                {!isProtected && (
                  <div className="absolute top-3 right-3">
                    {isConfirming ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); setConfirmDeleteAccountId(null); }}
                          className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteAccountId(null); }}
                          className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteAccountId(acc.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Delete this account"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="col-span-full p-12 text-center text-slate-500 italic border-2 border-dashed border-slate-200 rounded-3xl">
              No accounts available.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
          {/* Ledger Header Summary */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                {selectedAccount?.name}
              </h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Normal Balance: {selectedAccount?.balanceType} | {selectedAccount?.type} Account
              </p>
            </div>
            
            <div className={`px-5 py-3 rounded-2xl border flex flex-col items-end ${
              (transactions[transactions.length - 1]?.balance || 0) >= 0 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Closing Balance</span>
              <span className="text-xl font-mono font-bold tracking-tight">
                ₹{Math.abs(transactions[transactions.length - 1]?.balance || 0).toFixed(2)}
                <span className="text-base ml-1 opacity-80">
                  {transactions.length > 0 
                    ? ((transactions[transactions.length - 1].balance >= 0) ? (selectedAccount?.balanceType === 'Debit' ? 'Dr' : 'Cr') : (selectedAccount?.balanceType === 'Debit' ? 'Cr' : 'Dr'))
                    : ''}
                </span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Particulars</th>
                  <th className="px-6 py-4 font-semibold text-right">Debit (Dr)</th>
                  <th className="px-6 py-4 font-semibold text-right">Credit (Cr)</th>
                  <th className="px-6 py-4 font-semibold text-right">Balance</th>
                  <th className="px-6 py-4 font-semibold text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No transactions found for this account.</td>
                  </tr>
                ) : (
                  transactions.map((t, index) => (
                    <tr key={index} className={`hover:bg-slate-50/50 transition-colors group ${confirmDeleteId === t.entryId ? 'bg-red-50/60' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400 font-mono tracking-wider">{t.date}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{t.particulars}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={t.narration}>{t.narration}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-indigo-700">
                        {t.type === 'Debit' ? t.amount.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-700">
                        {t.type === 'Credit' ? t.amount.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                        {Math.abs(t.balance).toFixed(2)}
                        <span className="text-[10px] ml-1 opacity-60">
                          {t.balance >= 0 ? (selectedAccount?.balanceType === 'Debit' ? 'Dr' : 'Cr') : (selectedAccount?.balanceType === 'Debit' ? 'Cr' : 'Dr')}
                        </span>
                      </td>
                      {/* Delete column */}
                      <td className="px-4 py-4 text-center">
                        {confirmDeleteId === t.entryId ? (
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() => {
                                deleteJournalEntry(t.entryId);
                                setConfirmDeleteId(null);
                              }}
                              className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-lg transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(t.entryId)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete this journal entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
