"use client";

import { useAccounting } from '@/lib/AccountingContext';
import { formatDate } from '@/lib/formatDate';
import { Plus, ArrowRight, FileText, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function JournalListPage() {
  const { journalEntries, accounts, deleteJournalEntry } = useAccounting();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userStr = sessionStorage.getItem("aman_store_current_user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal</h1>
          <p className="text-sm text-slate-500">Record and view all transactions</p>
        </div>
        <Link 
          href="/dashboard/journal/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-2xl shadow-sm font-semibold transition-colors text-sm"
        >
          <Plus size={18} /> New Entry
        </Link>
      </div>

      <div className="space-y-4">
        {journalEntries.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 border-dashed rounded-3xl text-center space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText size={20} className="text-primary" />
            </div>
            <h3 className="text-md font-bold text-slate-700">No entries yet</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">Start recording your business transactions to see them appear in your journal and ledger automatically.</p>
            <Link 
              href="/dashboard/journal/new"
              className="inline-flex mt-4 items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors"
            >
              Pass your first Journal Entry <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          journalEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-3xl p-6 shadow-sm border transition-all group ${
                confirmDeleteId === entry.id
                  ? 'border-red-300 shadow-red-100 shadow-md bg-red-50/40'
                  : 'border-slate-200 hover:shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDate(entry.date)}</div>
                    {currentUser?.role === 'Admin' && entry.createdBy && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                        By {entry.createdBy}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-800 text-sm">{entry.narration}</div>
                </div>

                {/* Right side: LF badge + delete controls */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {entry.lf && (
                    <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                      LF: {entry.lf}
                    </div>
                  )}

                  {confirmDeleteId === entry.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-red-600 mr-1">Delete?</span>
                      <button
                        onClick={() => {
                          deleteJournalEntry(entry.id);
                          setConfirmDeleteId(null);
                        }}
                        className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/journal/new?edit=${entry.id}`)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl"
                        title="Edit journal entry"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                        title="Delete journal entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-2 font-semibold">Account Head</th>
                      <th className="pb-2 font-semibold text-right">Debit</th>
                      <th className="pb-2 font-semibold text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...entry.lines].sort((a, b) => (a.type === b.type ? 0 : (a.type === 'Debit' ? -1 : 1))).map((line, idx) => {
                      const account = accounts.find(a => a.id === line.accountId);
                      return (
                        <tr key={idx} className="font-medium text-slate-700">
                          <td className={`py-2 ${line.type === 'Credit' ? 'pl-6 text-slate-500' : ''}`}>
                            {line.type === 'Credit' && <span className="mr-1">To</span>}
                            {account?.name || 'Unknown Account'}
                          </td>
                          <td className="py-2 text-right text-indigo-700 font-mono">
                            {line.type === 'Debit' ? line.amount.toFixed(2) : '-'}
                          </td>
                          <td className="py-2 text-right text-emerald-700 font-mono">
                            {line.type === 'Credit' ? line.amount.toFixed(2) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
