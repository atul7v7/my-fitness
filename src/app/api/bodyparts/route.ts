import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BodyPart from "@/lib/models/BodyPart";
import { requireAuth, requireRole } from "@/lib/role";

// GET /api/bodyparts — any authenticated user
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  await dbConnect();
  const parts = (await BodyPart.find().sort({ name: 1 }).lean()) as any[];
  return NextResponse.json(parts.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    isCustom: p.isCustom,
  })));
}

// POST /api/bodyparts — athlete only (custom body part)
export async function POST(req: Request) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await dbConnect();
  const existing = await BodyPart.findOne({ name: name.trim() });
  if (existing) {
    return NextResponse.json({ error: "Body part already exists" }, { status: 409 });
  }
  const bp = await BodyPart.create({
    name: name.trim(),
    isCustom: true,
    createdBy: session.user.id,
  });
  return NextResponse.json({
    _id: bp._id.toString(),
    name: bp.name,
    isCustom: bp.isCustom,
  }, { status: 201 });
}
