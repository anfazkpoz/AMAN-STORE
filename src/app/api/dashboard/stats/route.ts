import dbConnect from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import Account from "@/models/Account";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    // 1. Calculate specifically IST Midnight bounds
    // We use pure JS Intl API to guarantee correct Asia/Kolkata timezone mapping for 'start' and 'end'
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // Parts format: MM/DD/YYYY
    const parts = formatter.formatToParts(now);
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const year = parts.find(p => p.type === 'year')?.value;

    const startOfDayStr = `${year}-${month}-${day}T00:00:00.000+05:30`;
    const endOfDayStr = `${year}-${month}-${day}T23:59:59.999+05:30`;

    const startOfDay = new Date(startOfDayStr);
    const endOfDay = new Date(endOfDayStr);
    const todayDateStr = `${year}-${month}-${day}`; // Format YYYY-MM-DD that some entries use

    // 2. Fetch Accounts to establish ID mapping
    const accounts = await Account.find({}).lean();
    
    const incomeKeywords = ['sales', 'fees', 'income', 'revenue'];
    const bankCashKeywords = ['cash', 'bank', 'hdfc', 'sbi', 'icici', 'axis', 'federal', 'canara', 'kotak'];

    const incomeAccountIds = accounts
      .filter((a: any) => incomeKeywords.some(k => (a.name || '').toLowerCase().includes(k)))
      .map((a: any) => a._id.toString());
      
    const bankCashAccountIds = accounts
      .filter((a: any) => bankCashKeywords.some(k => (a.name || '').toLowerCase().includes(k)))
      .map((a: any) => a._id.toString());

    // 3. Query the entries from MongoDB using proper IST time bounds
    const entries = await JournalEntry.find({
      $or: [
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
        { date: todayDateStr }
      ]
    }).lean();

    let salesTotal = 0;
    let collectionTotal = 0;

    // 4. Implement strict aggregation matching with Contra-Entry exclusions
    for (const entry of entries) {
       // Typically an entry has multiple lines. Check debits and credits.
       const debitLines = entry.lines.filter((l: any) => l.type === 'Debit');
       const creditLines = entry.lines.filter((l: any) => l.type === 'Credit');

       // Check Contra: Did all debits go to Bank/Cash and all credits come from Bank/Cash?
       // For a standard entry, we get the first matching pair or just evaluate the transaction as a whole.
       const hasCashBankDebit = debitLines.some((l: any) => bankCashAccountIds.includes(l.accountId.toString()));
       const hasCashBankCredit = creditLines.some((l: any) => bankCashAccountIds.includes(l.accountId.toString()));
       const isContra = hasCashBankDebit && hasCashBankCredit;

       // Compute Collections (Total Money In): Only log if Debit hits Cash/Bank natively AND it is NOT a contra-entry transfer inside those accounts.
       if (hasCashBankDebit && !isContra) {
         debitLines.forEach((debit: any) => {
           if (bankCashAccountIds.includes(debit.accountId.toString())) {
             collectionTotal += debit.amount;
           }
         });
       }

       // Compute Sales: Only log if Credit hits an Income/Sales account
       creditLines.forEach((credit: any) => {
         if (incomeAccountIds.includes(credit.accountId.toString())) {
           salesTotal += credit.amount;
         }
       });
    }

    return NextResponse.json({ 
      sales: salesTotal, 
      collection: collectionTotal,
      timeBounds: { startOfDay, endOfDay, timezone: "Asia/Kolkata" } 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
