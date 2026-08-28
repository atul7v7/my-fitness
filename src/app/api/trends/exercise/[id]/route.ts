import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LogEntry from "@/lib/models/LogEntry";
import { requireAuth } from "@/lib/role";
import { buildTrend } from "@/lib/suggestions";

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

// GET /api/trends/exercise/[id]?from=&to=
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  await dbConnect();
  const filter: Record<string, unknown> = { userId: session.user.id, exerciseId: params.id };
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (Object.keys(dateFilter).length) filter.date = dateFilter;

  const entries = (await LogEntry.find(filter).sort({ date: 1 }).lean()) as any[];
  const trend = buildTrend(entries.map(toDTO));
  return NextResponse.json(trend);
}
