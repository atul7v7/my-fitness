import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import BodyPart from "@/lib/models/BodyPart";
import { requireAuth, requireRole } from "@/lib/role";
import type { ExerciseDTO } from "@/lib/types";

function toDTO(e: any, bodyPartNames?: string[]): ExerciseDTO {
  return {
    _id: e._id.toString(),
    name: e.name,
    description: e.description || "",
    bodyParts: (e.bodyParts || []).map((b: any) => b.toString()),
    bodyPartNames,
    videoUrl: e.videoUrl ?? null,
    videoPublicId: e.videoPublicId ?? null,
    videoUploadedBy: e.videoUploadedBy ? e.videoUploadedBy.toString() : null,
    videoUploadedAt: e.videoUploadedAt ? e.videoUploadedAt.toISOString() : null,
    createdBy: e.createdBy.toString(),
    createdAt: e.createdAt.toISOString(),
  };
}

// GET /api/exercises?search=&bodyPart=
export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const bodyPart = searchParams.get("bodyPart");

  await dbConnect();
  const filter: Record<string, unknown> = {};
  if (search) filter.name = { $regex: search, $options: "i" };
  if (bodyPart) filter.bodyParts = bodyPart;

  const exercises = (await Exercise.find(filter).sort({ name: 1 }).lean()) as any[];

  // Resolve body part names in one query.
  const allBpIds = Array.from(new Set(exercises.flatMap((e) => e.bodyParts.map((b: any) => b.toString()))));
  const bps = (allBpIds.length ? await BodyPart.find({ _id: { $in: allBpIds } }).lean() : []) as any[];
  const bpMap = new Map(bps.map((b) => [b._id.toString(), b.name]));

  return NextResponse.json(exercises.map((e) => toDTO(e, e.bodyParts.map((b: any) => bpMap.get(b.toString())).filter(Boolean))));
}

// POST /api/exercises — athlete only
export async function POST(req: Request) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    bodyParts?: string[];
  };

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await dbConnect();
  const ex = await Exercise.create({
    name: body.name.trim(),
    description: body.description?.trim() || "",
    bodyParts: body.bodyParts || [],
    createdBy: session.user.id,
  });
  return NextResponse.json(toDTO(ex.toObject(), []), { status: 201 });
}
