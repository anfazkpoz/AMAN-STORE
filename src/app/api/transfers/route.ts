import dbConnect from "@/lib/mongodb";
import CashTransfer from "@/models/CashTransfer";
import JournalEntry from "@/models/JournalEntry";
import Account from "@/models/Account";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const transfers = await CashTransfer.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { amount, staffId, staffName } = body;
    if (!amount || !staffId || !staffName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const transfer = await CashTransfer.create({ amount, staffId, staffName, status: 'pending' });
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    
    const transfer = await CashTransfer.findById(id);
    if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    if (transfer.status === 'approved') return NextResponse.json({ error: "Already approved" }, { status: 400 });

    transfer.status = 'approved';
    await transfer.save();

    // Find main cash account
    let mainCashAcc = await Account.findOne({ name: 'Cash A/c' });
    if (!mainCashAcc) {
      mainCashAcc = await Account.create({ name: 'Cash A/c', type: 'Asset', balanceType: 'Debit', balance: 0 });
    }

    // Find staff cash account
    let staffCashAcc = await Account.findOne({ name: `Cash - ${transfer.staffName}` });
    if (!staffCashAcc) {
      staffCashAcc = await Account.create({ name: `Cash - ${transfer.staffName}`, type: 'Asset', balanceType: 'Debit', balance: 0 });
    }

    // Generate Journal Entry: Debit Main Cash, Credit Staff Cash
    const newEntry = new JournalEntry({
      date: new Date().toISOString().split('T')[0],
      narration: `Cash remittance from ${transfer.staffName}`,
      lf: '',
      lines: [
        { accountId: mainCashAcc._id, type: 'Debit', amount: transfer.amount },
        { accountId: staffCashAcc._id, type: 'Credit', amount: transfer.amount }
      ],
      createdBy: 'System (Approval)'
    });
    await newEntry.save();

    // Update account balances
    mainCashAcc.balance += transfer.amount;
    staffCashAcc.balance -= transfer.amount;
    await mainCashAcc.save();
    await staffCashAcc.save();

    return NextResponse.json(transfer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
