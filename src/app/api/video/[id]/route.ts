import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import { requireAuth, requireRole } from "@/lib/role";
import { deleteAsset } from "@/lib/cloudinary";

// POST /api/video/[id] — save uploaded video metadata to the exercise.
// Both athlete and instructor can upload/replace a video (spec items 8 & 9).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const body = (await req.json()) as { secure_url?: string; public_id?: string };
  if (!body.secure_url || !body.public_id) {
    return NextResponse.json({ error: "secure_url and public_id are required" }, { status: 400 });
  }

  await dbConnect();
  const ex = await Exercise.findById(params.id);
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the previous video from Cloudinary if replacing.
  if (ex.videoPublicId) {
    await deleteAsset(ex.videoPublicId);
  }

  ex.videoUrl = body.secure_url;
  ex.videoPublicId = body.public_id;
  ex.videoUploadedBy = session.user.id as unknown as typeof ex.videoUploadedBy;
  ex.videoUploadedAt = new Date();
  await ex.save();

  return NextResponse.json({
    videoUrl: ex.videoUrl,
    videoPublicId: ex.videoPublicId,
    videoUploadedAt: ex.videoUploadedAt?.toISOString() ?? null,
  });
}

// DELETE /api/video/[id] — athlete only (spec item 10: instructor cannot delete).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;

  await dbConnect();
  const ex = await Exercise.findById(params.id);
  if (!ex) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (ex.videoPublicId) {
    await deleteAsset(ex.videoPublicId);
  }
  ex.videoUrl = null;
  ex.videoPublicId = null;
  ex.videoUploadedBy = null;
  ex.videoUploadedAt = null;
  await ex.save();

  return NextResponse.json({ ok: true });
}
