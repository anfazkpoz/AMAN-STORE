export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/send-sms
 * Body: { phone: string, message: string }
 *
 * Uses Fast2SMS (fast2sms.com) — an Indian SMS gateway.
 * Set FAST2SMS_API_KEY in your .env.local file.
 * Get a free API key at: https://www.fast2sms.com
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone and message are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.FAST2SMS_API_KEY;

    if (!apiKey) {
      // API key not configured — return a specific flag so the UI can show a warning
      return NextResponse.json(
        { success: false, notConfigured: true, error: 'SMS API key not set. Add FAST2SMS_API_KEY to .env.local' },
        { status: 200 }
      );
    }

    // Fast2SMS Quick SMS API
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${phone}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'cache-control': 'no-cache' },
    });

    const data = await response.json();

    if (data.return === true) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({
        success: false,
        error: data.message?.join(', ') || 'SMS sending failed.',
      });
    }
  } catch (err) {
    console.error('[send-sms]', err);
    return NextResponse.json(
      { success: false, error: 'Server error while sending SMS.' },
      { status: 500 }
    );
  }
}
