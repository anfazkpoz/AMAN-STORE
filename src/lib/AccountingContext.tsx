"use client";
/* eslint-disable react-hooks/set-state-in-effect */


import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account, JournalEntry, Debtor } from './types';

// Pre-populate some essential AMAN STORE accounts
const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: 'Cash A/c', type: 'Asset', balanceType: 'Debit', balance: 0 },
  { id: '2', name: 'Bank A/c', type: 'Asset', balanceType: 'Debit', balance: 0 },
  { id: '3', name: 'Capital A/c', type: 'Equity', balanceType: 'Credit', balance: 0 },
  { id: '4', name: 'Sales A/c', type: 'Revenue', balanceType: 'Credit', balance: 0 },
  { id: '5', name: 'Purchases A/c', type: 'Expense', balanceType: 'Debit', balance: 0 },
];

interface AccountingState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  debtors: Debtor[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  deleteJournalEntry: (entryId: string) => void;
  deleteDebtor: (debtorId: string) => void;
  deleteAccount: (accountId: string) => void;
  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Account;
  addDebtor: (debtor: Omit<Debtor, 'id' | 'accountId' | 'currentBalance'>) => Debtor;
  reloadData: () => void;
}

const AccountingContext = createContext<AccountingState | undefined>(undefined);

export function AccountingProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage and RECOMPUTE all balances from journal entries.
  // This prevents stale balances caused by entries deleted outside of context.
  const reloadData = () => {
    const savedAccounts = localStorage.getItem('aman_accounts');
    const savedEntries  = localStorage.getItem('aman_entries');
    const savedDebtors  = localStorage.getItem('aman_debtors');

    const baseAccounts: Account[]      = savedAccounts ? JSON.parse(savedAccounts) : DEFAULT_ACCOUNTS;
    const loadedEntries: JournalEntry[] = savedEntries  ? JSON.parse(savedEntries)  : [];
    const loadedDebtors: Debtor[]       = savedDebtors  ? JSON.parse(savedDebtors)  : [];

    const freshAccounts = baseAccounts.map((a: Account) => ({ ...a, balance: 0 }));

    loadedEntries.forEach((entry: JournalEntry) => {
      entry.lines.forEach(line => {
        const idx = freshAccounts.findIndex((a: Account) => a.id === line.accountId);
        if (idx !== -1) {
          const acc = freshAccounts[idx];
          if (line.type === acc.balanceType) {
            acc.balance += line.amount;
          } else {
            acc.balance -= line.amount;
          }
        }
      });
    });

    setAccounts(freshAccounts);
    setJournalEntries(loadedEntries);
    setDebtors(loadedDebtors);
    setIsLoaded(true);
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('aman_accounts', JSON.stringify(accounts));
    localStorage.setItem('aman_entries', JSON.stringify(journalEntries));
    localStorage.setItem('aman_debtors', JSON.stringify(debtors));
  }, [accounts, journalEntries, debtors, isLoaded]);

  // Automated Ledger Posting Logic
  const addJournalEntry = (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: Date.now()
    };
    
    // Add to Journal Array
    setJournalEntries(prev => [newEntry, ...prev]);

    // Automatically Update Ledger (Account Balances)
    setAccounts(prevAccounts => {
      const updatedAccounts = [...prevAccounts];
      entry.lines.forEach(line => {
        const accountIndex = updatedAccounts.findIndex(a => a.id === line.accountId);
        if (accountIndex !== -1) {
          const acc = { ...updatedAccounts[accountIndex] }; // clone
          if (line.type === acc.balanceType) {
            acc.balance += line.amount;
          } else {
            acc.balance -= line.amount;
          }
          updatedAccounts[accountIndex] = acc;
        }
      });
      return updatedAccounts;
    });
  };

  const deleteJournalEntry = (entryId: string) => {
    // Find the entry to reverse its effects
    setJournalEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (!entry) return prev;

      // Reverse the account balance changes
      setAccounts(prevAccounts => {
        const updatedAccounts = [...prevAccounts];
        entry.lines.forEach(line => {
          const accountIndex = updatedAccounts.findIndex(a => a.id === line.accountId);
          if (accountIndex !== -1) {
            const acc = { ...updatedAccounts[accountIndex] };
            // Reverse: if line matched balanceType it was added, now subtract
            if (line.type === acc.balanceType) {
              acc.balance -= line.amount;
            } else {
              acc.balance += line.amount;
            }
            updatedAccounts[accountIndex] = acc;
          }
        });
        return updatedAccounts;
      });

      return prev.filter(e => e.id !== entryId);
    });
  };

  /**
   * deleteDebtor — removes a debtor and ALL side effects cleanly through context state:
   * 1. Finds every journal entry that references the debtor's ledger account.
   * 2. Reverses the balance impact of those entries on ALL accounts they touched
   *    (e.g. Sales A/c, Cash A/c get their balances corrected too).
   * 3. Removes those journal entries.
   * 4. Removes the debtor's ledger account.
   * 5. Removes the debtor record.
   * The save-to-localStorage effect then persists everything consistently.
   */
  const deleteDebtor = (debtorId: string) => {
    setDebtors(prevDebtors => {
      const debtor = prevDebtors.find(d => d.id === debtorId);
      if (!debtor) return prevDebtors;

      const accountIdToDelete = debtor.accountId;

      // Step 1 & 2: find affected entries and reverse ALL their line-level balance impacts
      setJournalEntries(prevEntries => {
        const entriesToRemove = prevEntries.filter(entry =>
          entry.lines.some(l => l.accountId === accountIdToDelete)
        );

        if (entriesToRemove.length > 0) {
          setAccounts(prevAccounts => {
            let updated = [...prevAccounts];
            entriesToRemove.forEach(entry => {
              entry.lines.forEach(line => {
                const idx = updated.findIndex(a => a.id === line.accountId);
                if (idx !== -1) {
                  const acc = { ...updated[idx] };
                  // Reverse: undo the balance change that was applied when the entry was posted
                  if (line.type === acc.balanceType) {
                    acc.balance -= line.amount;
                  } else {
                    acc.balance += line.amount;
                  }
                  updated[idx] = acc;
                }
              });
            });
            // Step 4: also remove the debtor's account
            return updated.filter(a => a.id !== accountIdToDelete);
          });
        } else {
          // No journal entries — just remove the account
          setAccounts(prev => prev.filter(a => a.id !== accountIdToDelete));
        }

        // Step 3: drop the journal entries that referenced the deleted account
        return prevEntries.filter(entry =>
          !entry.lines.some(l => l.accountId === accountIdToDelete)
        );
      });

      // Step 5: remove the debtor record
      return prevDebtors.filter(d => d.id !== debtorId);
    });
  };

  /**
   * deleteAccount — deletes a ledger account and all its side-effects:
   * 1. Finds every journal entry referencing this account.
   * 2. Reverses balance impact on ALL accounts touched by those entries.
   * 3. Removes those journal entries.
   * 4. Removes the account itself.
   * 5. Removes any linked debtor record + associated student user from localStorage.
   */
  const deleteAccount = (accountId: string) => {
    setJournalEntries(prevEntries => {
      const entriesToRemove = prevEntries.filter(entry =>
        entry.lines.some(l => l.accountId === accountId)
      );

      // Reverse balance impacts and remove the account
      setAccounts(prevAccounts => {
        let updated = [...prevAccounts];

        entriesToRemove.forEach(entry => {
          entry.lines.forEach(line => {
            const idx = updated.findIndex(a => a.id === line.accountId);
            if (idx !== -1) {
              const acc = { ...updated[idx] };
              if (line.type === acc.balanceType) {
                acc.balance -= line.amount;
              } else {
                acc.balance += line.amount;
              }
              updated[idx] = acc;
            }
          });
        });

        // Remove the account itself
        return updated.filter(a => a.id !== accountId);
      });

      // Remove any linked debtor record + also clean student user from localStorage
      setDebtors(prevDebtors => {
        const linkedDebtor = prevDebtors.find(d => d.accountId === accountId);
        if (linkedDebtor) {
          // Remove linked student user from localStorage
          try {
            const usersStr = localStorage.getItem('aman_store_users');
            if (usersStr) {
              const users = JSON.parse(usersStr);
              const filtered = users.filter((u: { debtorId?: string }) => u.debtorId !== linkedDebtor.id);
              localStorage.setItem('aman_store_users', JSON.stringify(filtered));
            }
          } catch (_) {}
        }
        return prevDebtors.filter(d => d.accountId !== accountId);
      });

      // Remove journal entries that referenced this account
      return prevEntries.filter(entry =>
        !entry.lines.some(l => l.accountId === accountId)
      );
    });
  };

  const addAccount = (account: Omit<Account, 'id' | 'balance'>) => {
    const newAccount: Account = {
      ...account,
      id: Date.now().toString(),
      balance: 0,
    };
    setAccounts(prev => [...prev, newAccount]);
    return newAccount;
  };

  const addDebtor = (debtor: Omit<Debtor, 'id' | 'accountId' | 'currentBalance'>) => {
    const timestamp = Date.now().toString();
    const newAccount: Account = {
      id: `acc_${timestamp}`,
      name: `${debtor.name} A/c`,
      type: 'Asset',
      balanceType: 'Debit',
      balance: 0,
    };
    
    const newDebtor: Debtor = {
      ...debtor,
      id: `debtor_${timestamp}`,
      accountId: newAccount.id,
      currentBalance: 0,
    };

    setAccounts(prev => [...prev, newAccount]);
    setDebtors(prev => [...prev, newDebtor]);
    return newDebtor;
  };

  return (
    <AccountingContext.Provider value={{ accounts, journalEntries, debtors, addJournalEntry, deleteJournalEntry, deleteDebtor, deleteAccount, addAccount, addDebtor, reloadData }}>
      {children}
    </AccountingContext.Provider>
  );
}

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (context === undefined) throw new Error("useAccounting must be within AccountingProvider");
  return context;
};
