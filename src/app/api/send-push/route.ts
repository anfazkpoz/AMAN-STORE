import dbConnect from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";
import { NextResponse } from "next/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";

webpush.setVapidDetails(
  "mailto:admin@amanstore.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// POST /api/send-push  — body: { userId, balance }
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, balance } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const record = await PushSubscriptionModel.findOne({ userId });
    if (!record) {
      return NextResponse.json({ error: "No subscription found for this student" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: "AMAN STORE",
      body: `Reminder: You have a pending balance of ₹${Math.abs(balance).toLocaleString()}.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: "/profile",
    });

    await webpush.sendNotification(record.subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Push] Send failed:", error);
    // If subscription is expired/invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      const { userId } = await req.json().catch(() => ({}));
      if (userId) await PushSubscriptionModel.findOneAndDelete({ userId });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
