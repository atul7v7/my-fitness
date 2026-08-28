import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LogEntry from "@/lib/models/LogEntry";
import { requireAuth } from "@/lib/role";
import { buildSuggestion } from "@/lib/suggestions";

function toDTO(e: any) {
  return {
    _id: e._id.toString(),
    exerciseId: e.exerciseId.toString(),
    userId: e.userId.toString(),
    date: e.date.toISOString(),
    sets: (e.sets || []).map((s: any) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe ?? null })),
    unit: e.unit,
    totalVolume: e.totalVolume,
    notes: e.notes || "",
    createdAt: e.createdAt.toISOString(),
  };
}

// GET /api/logentries/suggestion?exerciseId= — progressive-overload suggestion
export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ error: "exerciseId is required" }, { status: 400 });

  await dbConnect();
  // Last 3 sessions, most recent first.
  const recent = (await LogEntry.find({ userId: session.user.id, exerciseId })
    .sort({ date: -1 })
    .limit(3)
    .lean()) as any[];

  const suggestion = buildSuggestion(recent.map(toDTO));
  return NextResponse.json({ suggestion });
}
