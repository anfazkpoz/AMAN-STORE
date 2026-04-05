import dbConnect from "@/lib/mongodb";
import Debtor from "@/models/Debtor";
import Account from "@/models/Account";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const debtors = await Debtor.find({});
    return NextResponse.json(debtors);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    
    // Create new account for debtor if not provided
    let accountId = body.accountId;
    if (!accountId) {
      const newAccount = await Account.create({
        name: `${body.name} A/c`,
        type: 'Asset',
        balanceType: 'Debit',
        balance: 0,
      });
      accountId = newAccount._id;
    }

    const debtor = await Debtor.create({ ...body, accountId });
    return NextResponse.json(debtor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;

    const debtor = await Debtor.findById(id);
    if (!debtor) {
      return NextResponse.json({ error: "Debtor not found" }, { status: 404 });
    }

    // If name changed, update linked account name too
    if (updateData.name && updateData.name !== debtor.name) {
       await Account.findByIdAndUpdate(debtor.accountId, { 
         name: `${updateData.name.trim()} A/c` 
       });
    }

    const updatedDebtor = await Debtor.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json(updatedDebtor);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    const debtor = await Debtor.findById(id);
    if (debtor) {
      // Also delete the linked account? 
      // Based on original logic: yes.
      await Account.findByIdAndDelete(debtor.accountId);
      await Debtor.findByIdAndDelete(id);
    }
    return NextResponse.json({ message: "Debtor deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
