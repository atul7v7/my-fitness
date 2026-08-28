import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/role";

// POST /api/users — athlete creates a new account (instructor only, per spec).
export async function POST(req: Request) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const { name, email, password, role } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  const finalRole = role === "athlete" ? "athlete" : "instructor";

  await dbConnect();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: finalRole,
    unitPreference: "kg",
  });

  return NextResponse.json({
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  }, { status: 201 });
}
