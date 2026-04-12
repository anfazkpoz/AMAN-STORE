import dbConnect from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/push-subscription — save a user's subscription
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, subscription } = await req.json();
    if (!userId || !subscription) {
      return NextResponse.json({ error: "Missing userId or subscription" }, { status: 400 });
    }
    // Upsert: one record per user
    await PushSubscriptionModel.findOneAndUpdate(
      { userId },
      { userId, subscription },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/push-subscription — remove subscription on logout
export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { userId } = await req.json();
    await PushSubscriptionModel.findOneAndDelete({ userId });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
