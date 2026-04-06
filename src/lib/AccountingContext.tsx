"use client";
/* eslint-disable react-hooks/set-state-in-effect */


import React, { createContext, useContext, useEffect, useState } from 'react';
import { Account, JournalEntry, Debtor } from './types';

interface AccountingState {
  accounts: Account[];
  journalEntries: JournalEntry[];
  debtors: Debtor[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => Promise<void>;
  deleteJournalEntry: (entryId: string) => Promise<void>;
  deleteDebtor: (debtorId: string) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  addAccount: (account: Omit<Account, 'id' | 'balance'>) => Promise<Account>;
  addDebtor: (debtor: Omit<Debtor, 'id' | 'accountId' | 'currentBalance'>) => Promise<Debtor>;
  updateJournalEntry: (entry: JournalEntry) => Promise<void>;
  updateDebtor: (debtor: Debtor) => Promise<void>;
  reloadData: () => void;
  isLoaded: boolean;
}

const AccountingContext = createContext<AccountingState | undefined>(undefined);

export function AccountingProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadData = async () => {
    try {
      const [accRes, entriesRes, debtorsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/entries'),
        fetch('/api/debtors')
      ]);

      const accJson = await accRes.json();
      const entriesJson = await entriesRes.json();
      const debtorsJson = await debtorsRes.json();

      // Robustly check if each response is an array before mapping
      const normAcc = Array.isArray(accJson) 
        ? accJson.map((a: any) => ({ ...a, id: a._id })) 
        : [];
        
      const normEntries = Array.isArray(entriesJson) 
        ? entriesJson.map((e: any) => ({ 
            ...e, 
            id: e._id,
            lines: Array.isArray(e.lines) ? e.lines.map((l: any) => ({ ...l, id: l._id || l.id })) : []
          })) 
        : [];
        
      const normDebtors = Array.isArray(debtorsJson) 
        ? debtorsJson.map((d: any) => ({ ...d, id: d._id })) 
        : [];

      if (!Array.isArray(accJson) || !Array.isArray(entriesJson) || !Array.isArray(debtorsJson)) {
        console.error("One or more API responses were not arrays:", { accJson, entriesJson, debtorsJson });
      }

      setAccounts(normAcc);
      setJournalEntries(normEntries);
      setDebtors(normDebtors);
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to reload data:", error);
    }
  };

  useEffect(() => {
    reloadData();
  }, []);

  const addJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  const updateJournalEntry = async (entry: JournalEntry) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to update entry:", error);
    }
  };

  const updateDebtor = async (debtor: Debtor) => {
    try {
      const res = await fetch('/api/debtors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtor),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to update debtor:", error);
    }
  };

  const deleteJournalEntry = async (entryId: string) => {
    try {
      const res = await fetch('/api/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const deleteDebtor = async (debtorId: string) => {
    try {
      const res = await fetch('/api/debtors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: debtorId }),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to delete debtor:", error);
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId }),
      });
      if (res.ok) {
        await reloadData();
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  const addAccount = async (account: Omit<Account, 'id' | 'balance'>) => {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    const newAccount = await res.json();
    const normalized = { ...newAccount, id: newAccount._id };
    setAccounts(prev => [...prev, normalized]);
    return normalized;
  };

  const addDebtor = async (debtor: Omit<Debtor, 'id' | 'accountId' | 'currentBalance'>) => {
    const res = await fetch('/api/debtors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debtor),
    });
    const newDebtor = await res.json();
    const normalized = { ...newDebtor, id: newDebtor._id };
    await reloadData();
    return normalized;
  };

  return (
    <AccountingContext.Provider value={{ accounts, journalEntries, debtors, addJournalEntry, updateJournalEntry, deleteJournalEntry, deleteDebtor, updateDebtor, deleteAccount, addAccount, addDebtor, reloadData, isLoaded }}>
      {children}
    </AccountingContext.Provider>
  );
}

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (context === undefined) throw new Error("useAccounting must be within AccountingProvider");
  return context;
};
