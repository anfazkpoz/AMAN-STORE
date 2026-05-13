import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Debtor from "@/models/Debtor";
import Account from "@/models/Account";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, currentPassword, newPassword, name, phone } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = (user.password === currentPassword) || (await bcrypt.compare(currentPassword, user.password));
    
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 401 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Sync student related changes if name/phone changes
    if (user.role === 'Student' && user.debtorId) {
       const dUpdate: any = {};
       if (name && name !== user.name) dUpdate.name = name;
       if (phone && phone !== user.phone) dUpdate.mobileNumber = phone;

       if (Object.keys(dUpdate).length > 0) {
          const debtor = await Debtor.findByIdAndUpdate(user.debtorId, dUpdate, { new: true });
          if (dUpdate.name && debtor) {
             await Account.findByIdAndUpdate(debtor.accountId, { 
               name: `${dUpdate.name.trim()} A/c` 
             });
          }
       }
    }

    // Update User with new profile fields and visiblePassword (without structural schema change)
    const updatePayload: any = {
      password: hashedPassword,
      visiblePassword: newPassword
    };
    if (name) updatePayload.name = name;
    if (phone) updatePayload.phone = phone;

    await User.updateOne(
      { _id: user._id },
      { $set: updatePayload },
      { strict: false }
    );

    // Invalidate dashboard path to auto-refresh admin views using server components
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/debtors');

    return NextResponse.json({ message: "Profile & Password updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
