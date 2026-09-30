import dbConnect from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import Account from "@/models/Account";
import Debtor from "@/models/Debtor";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function recalculateDebtorBalance(accountId: string) {
  const debtor = await Debtor.findOne({ accountId });
  if (debtor) {
    const allEntries = await JournalEntry.find({ "lines.accountId": accountId });
    let calcBalance = 0;
    allEntries.forEach(entry => {
      entry.lines.forEach((line: any) => {
        if (line.accountId.toString() === accountId) {
          if (line.type === 'Debit') calcBalance += Number(line.amount);
          if (line.type === 'Credit') calcBalance -= Number(line.amount);
        }
      });
    });
    debtor.currentBalance = calcBalance;
    await debtor.save();
  }
}

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
    const body = await req.json().catch(() => ({}));

    for (const line of body.lines) {
      const debtor = await Debtor.findOne({ accountId: line.accountId });
      if (debtor?.isArchived) {
        return NextResponse.json({ error: `Account for ${debtor.name} is archived. No new entries allowed.` }, { status: 403 });
      }
    }

    const entry = await JournalEntry.create(body);

    // Update account balances
    for (const line of body.lines) {
      const account = await Account.findById(line.accountId);
      if (account) {
        if (line.type === account.balanceType) {
          account.balance += Number(line.amount);
        } else {
          account.balance -= Number(line.amount);
        }
        await account.save();

        await recalculateDebtorBalance(account._id.toString());
      }
    }

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json().catch(() => ({}));
    const { id, ...updateData } = body;

    const oldEntry = await JournalEntry.findById(id);
    if (!oldEntry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // 1. Reverse OLD account balances
    for (const line of oldEntry.lines) {
      const account = await Account.findById(line.accountId);
      if (account) {
        if (line.type === account.balanceType) {
          account.balance -= Number(line.amount);
        } else {
          account.balance += Number(line.amount);
        }
        await account.save();
      }
    }

    // 2. Update the Journal Entry
    const updatedEntry = await JournalEntry.findByIdAndUpdate(id, updateData, { new: true });

    // 3. Apply NEW account balances
    const affectedAccounts = new Set<string>();
    for (const line of oldEntry.lines) affectedAccounts.add(line.accountId.toString());
    for (const line of updateData.lines) affectedAccounts.add(line.accountId.toString());

    for (const line of updateData.lines) {
      const account = await Account.findById(line.accountId);
      if (account) {
        if (line.type === account.balanceType) {
          account.balance += Number(line.amount);
        } else {
          account.balance -= Number(line.amount);
        }
        await account.save();
      }
    }

    for (const accId of affectedAccounts) {
      await recalculateDebtorBalance(accId);
    }

    return NextResponse.json(updatedEntry);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json().catch(() => ({}));
    const entry = await JournalEntry.findById(id);

    if (entry) {
      // Reverse account balances
      for (const line of entry.lines) {
        const account = await Account.findById(line.accountId);
        if (account) {
          if (line.type === account.balanceType) {
            account.balance -= Number(line.amount);
          } else {
            account.balance += Number(line.amount);
          }
          await account.save();
        }
      }
      await JournalEntry.findByIdAndDelete(id);

      for (const line of entry.lines) {
        await recalculateDebtorBalance(line.accountId.toString());
      }
    }

    return NextResponse.json({ message: "Journal entry deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
