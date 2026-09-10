import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Account from "@/models/Account";
import Debtor from "@/models/Debtor";
import AppSettings from "@/models/AppSettings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const filter = role ? { role } : {};
    const users = await User.find(filter).lean();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

  // 3. Check Authorization header
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

  // 4. Check explicit custom headers
  const headerRole = req.headers.get('x-user-role');
  if (headerRole) {
    return { role: headerRole };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, phone, mobile, password, role, batch, creatorRole } = body;

    // Check global registration lock for Student creation
    if (role === 'Student') {
      const settings = await AppSettings.findOne({ key: 'global' }).lean();
      const isRegistrationEnabled = (settings as any)?.isRegistrationEnabled ?? true;

      if (!isRegistrationEnabled) {
        const session = getSessionFromRequest(req);
        const headerRole = req.headers.get('x-user-role');
        const effectiveRole = (session?.role || headerRole || creatorRole || '').toLowerCase();
        const isPrivileged = effectiveRole === 'admin' || effectiveRole === 'staff';

        if (!isPrivileged) {
          return NextResponse.json(
            { error: "Public registration is currently closed." },
            { status: 403 }
          );
        }
      }
    }

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

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, ...updateData } = body;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Sync student related changes if name/batch/phone changes
    if (user.role === 'Student' && user.debtorId) {
       const dUpdate: any = {};
       if (updateData.name) dUpdate.name = updateData.name;
       if (updateData.batch) dUpdate.batch = updateData.batch;
       if (updateData.phone) dUpdate.mobileNumber = updateData.phone;

       if (Object.keys(dUpdate).length > 0) {
          const debtor = await Debtor.findByIdAndUpdate(user.debtorId, dUpdate, { new: true });
          if (updateData.name && debtor) {
             await Account.findByIdAndUpdate(debtor.accountId, { 
               name: `${updateData.name.trim()} A/c` 
             });
          }
       }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    return NextResponse.json(updatedUser);
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
