import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Exercise from "@/lib/models/Exercise";
import LogEntry from "@/lib/models/LogEntry";
import { requireAuth } from "@/lib/role";
import { buildTrend } from "@/lib/suggestions";
import type { TrendResult } from "@/lib/types";

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

// GET /api/trends/bodypart/[id]?from=&to=
// Returns one per-exercise trend analysis per exercise that is tagged with
// this body part and that the user has actually logged. Exercises without
// entries in range are omitted (callers can list them via /api/exercises).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  await dbConnect();
  // Find all exercises tagged with this body part.
  const exercises = (await Exercise.find({ bodyParts: params.id }).lean()) as any[];
  const exerciseIds = exercises.map((e) => e._id);
  const exerciseNames = new Map(exercises.map((e) => [e._id.toString(), e.name]));

  const filter: Record<string, unknown> = {
    userId: session.user.id,
    exerciseId: { $in: exerciseIds },
  };
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (Object.keys(dateFilter).length) filter.date = dateFilter;

  const entries = (await LogEntry.find(filter).sort({ date: 1 }).lean()) as any[];

  // Group the user's entries by exercise, then build an independent trend
  // analysis per exercise. Mixing movements (e.g. squat + calf raise) into a
  // single "max weight" series is meaningless, so each exercise gets its own
  // chart and stats.
  const byExercise = new Map<string, any[]>();
  for (const e of entries) {
    const key = e.exerciseId.toString();
    const list = byExercise.get(key);
    if (list) list.push(e);
    else byExercise.set(key, [e]);
  }

  const breakdown: {
    exerciseId: string;
    name: string;
    trend: TrendResult;
  }[] = [];
  for (const [exerciseId, list] of byExercise) {
    breakdown.push({
      exerciseId,
      name: exerciseNames.get(exerciseId) || "Unknown exercise",
      trend: buildTrend(list.map(toDTO)),
    });
  }
  // Deterministic order so cached responses stay stable between reloads.
  breakdown.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    bodyPartId: params.id,
    loggedExercises: breakdown.length,
    totalExercises: exercises.length,
    breakdown,
  });
}
