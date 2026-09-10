import dbConnect from "@/lib/mongodb";
import Debtor from "@/models/Debtor";
import Account from "@/models/Account";
import JournalEntry from "@/models/JournalEntry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Search debtor by _id or accountId
    let debtor = await Debtor.findById(id).lean();
    if (!debtor) {
      debtor = await Debtor.findOne({ accountId: id }).lean();
    }

    if (!debtor) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const account = await Account.findById(debtor.accountId).lean();
    if (!account) {
      return NextResponse.json({ error: "Student account not found" }, { status: 404 });
    }

    // Fetch journal transactions for this account
    const entries = await JournalEntry.find({
      "lines.accountId": debtor.accountId,
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // Compute live balance
    let drTotal = 0;
    let crTotal = 0;

    const formattedTransactions = entries.map((e: any) => {
      const studentLine = e.lines.find(
        (l: any) => String(l.accountId) === String(debtor.accountId)
      );
      const isCredit = studentLine?.type === "Credit";
      const amt = Number(studentLine?.amount) || 0;

      if (isCredit) crTotal += amt;
      else drTotal += amt;

      return {
        id: e._id.toString(),
        date: e.date,
        narration: e.narration || "Store Entry",
        type: studentLine?.type || "Debit",
        amount: amt,
        isCredit,
      };
    });

    const liveBalance = drTotal - crTotal;

    return NextResponse.json({
      debtor: {
        id: (debtor as any)._id.toString(),
        name: debtor.name,
        batch: debtor.batch || "",
        mobileNumber: debtor.mobileNumber || "",
        accountId: debtor.accountId,
      },
      account: {
        id: (account as any)._id.toString(),
        name: account.name,
        balanceType: account.balanceType,
        balance: liveBalance,
      },
      currentBalance: liveBalance,
      transactions: formattedTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
