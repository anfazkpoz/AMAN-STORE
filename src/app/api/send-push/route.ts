import dbConnect from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";
import { NextResponse } from "next/server";
import webpush from "web-push";

export const dynamic = "force-dynamic";

// POST /api/send-push  — body: { userId, balance }
export async function POST(req: Request) {
  // Guard: ensure VAPID keys are configured in this environment
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "Push notifications are not configured on this server. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables." },
      { status: 503 }
    );
  }

  // Parse body once — re-reading req.json() after the first call always fails
  let body: { userId?: string; balance?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, balance } = body;

  try {
    // Initialize VAPID inside the handler to avoid module-level errors during build
    webpush.setVapidDetails(
      "mailto:admin@amanstore.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    await dbConnect();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const record = await PushSubscriptionModel.findOne({ userId });
    if (!record) {
      return NextResponse.json({ error: "No subscription found for this student" }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: "AMAN STORE",
      body: `Reminder: You have a pending balance of ₹${Math.abs(balance ?? 0).toLocaleString()}.`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: "/profile",
    });

    await webpush.sendNotification(record.subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Push] Send failed:", error);
    // If subscription is expired/invalid, remove it using the already-parsed userId
    if ((error.statusCode === 410 || error.statusCode === 404) && userId) {
      await PushSubscriptionModel.findOneAndDelete({ userId });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
