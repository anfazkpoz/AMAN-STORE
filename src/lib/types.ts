export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type Role = 'Admin' | 'Staff' | 'Student';
export type Batch = 'JD1' | 'JD2' | 'HS1' | 'HS2' | 'BS1' | 'BS2' | 'BS3' | 'BS4' | 'BS5';

export interface User {
  id: string;
  name: string;
  phone: string;      // login ID (for staff: auto-generated; for student/admin: actual phone)
  mobile?: string;    // actual mobile number (stored for staff SMS purposes)
  password?: string;
  role: Role;
  batch?: Batch; 
  debtorId?: string; 
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balanceType: 'Debit' | 'Credit';
  balance: number;
}

export interface Debtor {
  id: string;
  accountId: string; // References Account
  name: string;
  mobileNumber: string;
  batch?: Batch; // Newly added for Batch classification
  currentBalance: number;
}

export interface JournalLine {
  id: string;
  accountId: string; // The selected Account Ref
  type: 'Debit' | 'Credit';
  amount: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  narration: string;
  lf: string; // Ledger Folio
  lines: JournalLine[];
  createdAt: number;
  createdBy?: string;
}
