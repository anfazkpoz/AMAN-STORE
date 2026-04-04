import dbConnect from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import Account from "@/models/Account";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();
    const entries = await JournalEntry.find({}).sort({ createdAt: -1 });
    return NextResponse.json(entries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const entry = await JournalEntry.create(body);

    // Update account balances
    for (const line of body.lines) {
      const account = await Account.findById(line.accountId);
      if (account) {
        if (line.type === account.balanceType) {
          account.balance += line.amount;
        } else {
          account.balance -= line.amount;
        }
        await account.save();
      }
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    const entry = await JournalEntry.findById(id);

    if (entry) {
      // Reverse account balances
      for (const line of entry.lines) {
        const account = await Account.findById(line.accountId);
        if (account) {
          if (line.type === account.balanceType) {
            account.balance -= line.amount;
          } else {
            account.balance += line.amount;
          }
          await account.save();
        }
      }
      await JournalEntry.findByIdAndDelete(id);
    }

    return NextResponse.json({ message: "Journal entry deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
