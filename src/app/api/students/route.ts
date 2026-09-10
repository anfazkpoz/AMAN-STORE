import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Account from "@/models/Account";
import Debtor from "@/models/Debtor";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(jsonStr);
    }
  } catch {}
  return null;
}

function getSessionFromRequest(req: Request): { role?: string; id?: string; name?: string } | null {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );

    // 1. Check Aman Store session cookie
    if (cookies.aman_store_session) {
      try {
        const decoded = decodeURIComponent(cookies.aman_store_session);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }

    // 2. Check NextAuth cookies
    const nextAuthToken = cookies['next-auth.session-token'] || cookies['__Secure-next-auth.session-token'];
    if (nextAuthToken) {
      const jwtPayload = parseJwtPayload(nextAuthToken);
      if (jwtPayload) {
        return {
          role: jwtPayload.role || jwtPayload.user?.role,
          id: jwtPayload.id || jwtPayload.sub || jwtPayload.user?.id,
          name: jwtPayload.name || jwtPayload.user?.name,
        };
      }
      try {
        const parsed = JSON.parse(decodeURIComponent(nextAuthToken));
        if (parsed) return parsed;
      } catch {}
    }
  } catch {}

  // 3. Check Authorization header (Bearer token, JWT, or JSON)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    const jwtPayload = parseJwtPayload(rawToken);
    if (jwtPayload) {
      return {
        role: jwtPayload.role || jwtPayload.user?.role,
        id: jwtPayload.id || jwtPayload.sub || jwtPayload.user?.id,
        name: jwtPayload.name || jwtPayload.user?.name,
      };
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(rawToken));
      if (parsed) return parsed;
    } catch {}
    try {
      const parsed = JSON.parse(rawToken);
      if (parsed) return parsed;
    } catch {}
  }

  // 4. Check explicit role headers
  const headerRole = req.headers.get('x-user-role');
  if (headerRole) {
    return { role: headerRole };
  }

  return null;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const students = await User.find({ role: 'Student' }).lean();
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, phone, mobile, password, batch, creatorRole } = body;

    // 1. Fetch global registration setting
    const settings = await AppSettings.findOne({ key: 'global' }).lean();
    const isRegistrationEnabled = (settings as any)?.isRegistrationEnabled ?? true;

    // 2. CRITICAL LOGIC: If registration is disabled, check if user is admin or staff
    if (!isRegistrationEnabled) {
      const session = getSessionFromRequest(req);
      const effectiveRole = (session?.role || creatorRole || '').toLowerCase();
      const isPrivileged = effectiveRole === 'admin' || effectiveRole === 'staff';

      if (!isPrivileged) {
        return NextResponse.json(
          { error: "Public registration is currently closed." },
          { status: 403 }
        );
      }
    }

    const studentPhone = (phone || mobile || '').trim();
    if (!name?.trim() || !studentPhone || !password?.trim()) {
      return NextResponse.json(
        { error: "Name, phone, and password are required." },
        { status: 400 }
      );
    }

    // Check if student already exists
    const existing = await User.findOne({ phone: studentPhone });
    if (existing) {
      return NextResponse.json({ error: "User already exists with this phone number" }, { status: 400 });
    }

    // Create Ledger Account for Student
    const newAccount = await Account.create({
      name: `${name.trim()} A/c`,
      type: 'Asset',
      balanceType: 'Debit',
      balance: 0,
    });

    // Create Debtor for Student
    const newDebtor = await Debtor.create({
      accountId: newAccount._id,
      name: name.trim(),
      mobileNumber: studentPhone,
      batch: batch || '',
      currentBalance: 0,
    });

    // Create User record
    const newUser = await User.create({
      name: name.trim(),
      phone: studentPhone,
      password: password.trim(),
      role: 'Student',
      batch: batch || '',
      debtorId: newDebtor._id,
    });

    return NextResponse.json({ user: newUser, debtor: newDebtor, account: newAccount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
