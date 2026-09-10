import dbConnect from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import Account from "@/models/Account";
import Debtor from "@/models/Debtor";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function fixUnbalancedAndSyncBalances() {
  await dbConnect();

  // 1. Find Cash A/c or fallback default asset account
  let cashAccount = await Account.findOne({
    $or: [{ _id: "1" }, { name: { $regex: /cash/i } }],
  });

  if (!cashAccount) {
    cashAccount = await Account.findOne({ type: "Asset" });
  }

  const cashAccountId = cashAccount ? cashAccount._id.toString() : "1";
  const cashAccountName = cashAccount ? cashAccount.name : "Cash A/c";

  // 2. Fetch all JournalEntry documents
  const entries = await JournalEntry.find({});

  let fixedUnbalancedCount = 0;
  const fixedUnbalancedEntries: any[] = [];

  // Step 1: Detect & auto-fix any unbalanced journal entries
  for (const entry of entries) {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of entry.lines || []) {
      const amt = Number(line.amount) || 0;
      const type = (line.type || "").toLowerCase();
      if (type === "debit") {
        totalDebits += amt;
      } else if (type === "credit") {
        totalCredits += amt;
      }
    }

    totalDebits = Math.round(totalDebits * 100) / 100;
    totalCredits = Math.round(totalCredits * 100) / 100;
    const diff = Math.round(Math.abs(totalDebits - totalCredits) * 100) / 100;

    if (diff > 0.001) {
      fixedUnbalancedCount++;
      let adjustmentType: "Debit" | "Credit";

      if (totalCredits > totalDebits) {
        adjustmentType = "Debit";
        entry.lines.push({
          accountId: cashAccountId,
          type: "Debit",
          amount: diff,
        });
      } else {
        adjustmentType = "Credit";
        entry.lines.push({
          accountId: cashAccountId,
          type: "Credit",
          amount: diff,
        });
      }

      await entry.save();

      fixedUnbalancedEntries.push({
        entryId: entry._id.toString(),
        date: entry.date,
        narration: entry.narration || "",
        previousDebits: totalDebits,
        previousCredits: totalCredits,
        difference: diff,
        adjustmentType,
        assignedToAccountId: cashAccountId,
        assignedToAccountName: cashAccountName,
      });
    }
  }

  // Step 2: Recalculate and synchronize all Account balances from live JournalEntries
  const allAccounts = await Account.find({});
  // Re-fetch all entries in case any were modified in Step 1
  const activeEntries = await JournalEntry.find({});

  // Map to accumulate live debits and credits per accountId
  const liveTotals: Record<string, { dr: number; cr: number }> = {};

  for (const entry of activeEntries) {
    for (const line of entry.lines || []) {
      const accId = String(line.accountId);
      if (!liveTotals[accId]) {
        liveTotals[accId] = { dr: 0, cr: 0 };
      }
      const amt = Number(line.amount) || 0;
      const type = (line.type || "").toLowerCase();
      if (type === "debit") {
        liveTotals[accId].dr += amt;
      } else if (type === "credit") {
        liveTotals[accId].cr += amt;
      }
    }
  }

  const reconciledAccounts: any[] = [];

  for (const account of allAccounts) {
    const accId = String(account._id);
    const totals = liveTotals[accId] || { dr: 0, cr: 0 };
    const liveBalance =
      account.balanceType === "Debit"
        ? Math.round((totals.dr - totals.cr) * 100) / 100
        : Math.round((totals.cr - totals.dr) * 100) / 100;

    const previousBalance = Number(account.balance) || 0;
    const diff = Math.round(Math.abs(liveBalance - previousBalance) * 100) / 100;

    if (diff > 0.001) {
      account.balance = liveBalance;
      await account.save();

      reconciledAccounts.push({
        accountId: accId,
        name: account.name,
        type: account.type,
        balanceType: account.balanceType,
        previousStoredBalance: previousBalance,
        newSynchronizedBalance: liveBalance,
        driftFixed: liveBalance - previousBalance,
      });
    }
  }

  // Step 3: Synchronize Debtor currentBalance fields to match account balances
  const allDebtors = await Debtor.find({});
  let reconciledDebtorsCount = 0;

  for (const debtor of allDebtors) {
    const totals = liveTotals[String(debtor.accountId)] || { dr: 0, cr: 0 };
    // Debtor balance is asset (Debit - Credit)
    const liveDebtorBalance = Math.round((totals.dr - totals.cr) * 100) / 100;
    const prev = Number(debtor.currentBalance) || 0;

    if (Math.abs(liveDebtorBalance - prev) > 0.001) {
      debtor.currentBalance = liveDebtorBalance;
      await debtor.save();
      reconciledDebtorsCount++;
    }
  }

  return {
    success: true,
    message: `Database synchronization complete. Fixed ${fixedUnbalancedCount} unbalanced entries and reconciled ${reconciledAccounts.length} account balances.`,
    journalEntriesScanned: entries.length,
    unbalancedEntriesFixed: fixedUnbalancedCount,
    fixedUnbalancedDetails: fixedUnbalancedEntries,
    accountsReconciledCount: reconciledAccounts.length,
    reconciledAccounts,
    debtorsReconciledCount: reconciledDebtorsCount,
    cashAccountUsed: {
      id: cashAccountId,
      name: cashAccountName,
    },
  };
}

export async function GET() {
  try {
    const result = await fixUnbalancedAndSyncBalances();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fix and reconcile database" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await fixUnbalancedAndSyncBalances();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fix and reconcile database" },
      { status: 500 }
    );
  }
}
