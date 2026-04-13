import dbConnect from "@/lib/mongodb";
import Account from "@/models/Account";
import JournalEntry from "@/models/JournalEntry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const accounts = await Account.find({});
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const account = await Account.create(body);
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;
    const account = await Account.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    
    // Delete all journal entries referencing this account to prevent orphaned data
    await JournalEntry.deleteMany({ "lines.accountId": id });
    
    // Delete the actual account only after entries are removed
    await Account.findByIdAndDelete(id);
    
    return NextResponse.json({ message: "Account and related journal entries deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
