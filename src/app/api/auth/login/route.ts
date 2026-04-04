import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { phone, password, role } = await req.json();

    // Check if we need to seed the default admin
    const adminCount = await User.countDocuments({ role: 'Admin' });
    if (adminCount === 0) {
      await User.create({
        name: "Main Admin",
        phone: "anfaz@123",
        password: "!@#anfaz",
        role: "Admin"
      });
      console.log("Seeded default admin");
    }

    const staffCount = await User.countDocuments({ role: 'Staff' });
    if (staffCount === 0) {
      await User.create({
        name: "Staff Member",
        phone: "1234567890",
        password: "staff",
        role: "Staff"
      });
      console.log("Seeded default staff");
    }

    const user = await User.findOne({ phone, password, role });
    if (!user) {
      return NextResponse.json({ error: "Invalid User ID or Password." }, { status: 401 });
    }

    return NextResponse.json({ 
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        batch: user.batch,
        debtorId: user.debtorId
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
