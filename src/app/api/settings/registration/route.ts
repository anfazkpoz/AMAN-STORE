import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AppSettings from '@/models/AppSettings';

// GET — returns { isRegistrationEnabled: boolean }
// Safe default: if no document exists yet, registration is ON (true)
export async function GET() {
  try {
    await dbConnect();
    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    const isRegistrationEnabled = (settings as any)?.isRegistrationEnabled ?? true;
    return NextResponse.json({ isRegistrationEnabled });
  } catch (err: any) {
    console.error('[GET /api/settings/registration]', err);
    return NextResponse.json({ isRegistrationEnabled: true });
  }
}

// PUT — body: { isRegistrationEnabled: boolean }
// Uses findOneAndUpdate with upsert so it creates the doc if it doesn't exist
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { isRegistrationEnabled } = await request.json();

    if (typeof isRegistrationEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'isRegistrationEnabled must be a boolean' },
        { status: 400 }
      );
    }

    const updated = await AppSettings.findOneAndUpdate(
      { key: 'global' },
      { $set: { isRegistrationEnabled } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ isRegistrationEnabled: updated.isRegistrationEnabled });
  } catch (err: any) {
    console.error('[PUT /api/settings/registration]', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
