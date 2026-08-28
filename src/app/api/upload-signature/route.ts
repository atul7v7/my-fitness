import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/role";
import { generateUploadSignature, isConfigured } from "@/lib/cloudinary";

// GET /api/upload-signature?folder=exercises
// Returns a signed payload for client-side direct upload to Cloudinary.
// Both athlete and instructor can upload videos (per spec items 8 & 9).
export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  if (!isConfigured()) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder") || "fitness-videos";
  const payload = generateUploadSignature(folder);
  return NextResponse.json(payload);
}
