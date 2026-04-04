import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Account from "@/models/Account";
import Debtor from "@/models/Debtor";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const filter = role ? { role } : {};
    const users = await User.find(filter);
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, phone, mobile, password, role, batch } = body;

    // Check if user already exists
    const existing = await User.findOne({ phone });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    let debtorId;
    if (role === 'Student') {
      // Create Ledger Account and Debtor for students
      const newAccount = await Account.create({
        name: `${name.trim()} A/c`,
        type: 'Asset',
        balanceType: 'Debit',
        balance: 0,
      });

      const newDebtor = await Debtor.create({
        accountId: newAccount._id,
        name: name.trim(),
        mobileNumber: phone,
        batch: batch,
        currentBalance: 0,
      });
      debtorId = newDebtor._id;
    }

    const newUser = await User.create({
      name,
      phone,
      mobile,
      password,
      role,
      batch,
      debtorId,
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    const user = await User.findById(id);
    if (user && user.role === 'Student' && user.debtorId) {
       const debtor = await Debtor.findById(user.debtorId);
       if (debtor) {
         await Account.findByIdAndDelete(debtor.accountId);
         await Debtor.findByIdAndDelete(user.debtorId);
       }
    }
    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: "User deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
