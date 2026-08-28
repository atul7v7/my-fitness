import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import BodyPart from "@/lib/models/BodyPart";
import { requireAuth, requireRole } from "@/lib/role";
import { deleteAsset } from "@/lib/cloudinary";

function toDTO(e: any, bodyPartNames?: string[]) {
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

// GET /api/exercises/[id]
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  await dbConnect();
  const ex = (await Exercise.findById(params.id).lean()) as any;
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bps = (ex.bodyParts.length ? await BodyPart.find({ _id: { $in: ex.bodyParts } }).lean() : []) as any[];
  const names = bps.map((b) => b.name);
  return NextResponse.json(toDTO(ex, names));
}

// PUT /api/exercises/[id] — athlete only
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    bodyParts?: string[];
  };

  await dbConnect();
  const ex = await Exercise.findByIdAndUpdate(
    params.id,
    {
      $set: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.bodyParts !== undefined ? { bodyParts: body.bodyParts } : {}),
      },
    },
    { new: true }
  ).lean() as any;
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toDTO(ex));
}

// DELETE /api/exercises/[id] — athlete only
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;

  await dbConnect();
  const ex = await Exercise.findByIdAndDelete(params.id);
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clean up video from Cloudinary if present.
  if (ex.videoPublicId) {
    await deleteAsset(ex.videoPublicId);
  }
  return NextResponse.json({ ok: true });
}
