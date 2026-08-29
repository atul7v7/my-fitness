import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/role";

// GET /api/trainers — list all trainer (instructor) accounts, for athletes to pick from.
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  await dbConnect();
  const trainers = await User.find({ role: "instructor" })
    .select("name email createdAt")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json(
    trainers.map((t: any) => ({
      _id: t._id.toString(),
      name: t.name,
      email: t.email,
      createdAt: t.createdAt.toISOString(),
    }))
  );
}
