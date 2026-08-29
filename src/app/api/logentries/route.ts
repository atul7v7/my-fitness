import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LogEntry from "@/lib/models/LogEntry";
import TrainerConnection from "@/lib/models/TrainerConnection";
import { requireAuth, requireRole } from "@/lib/role";
import { computeTotalVolume } from "@/lib/suggestions";
import type { LogEntryDTO, SetDTO } from "@/lib/types";

function toDTO(e: any): LogEntryDTO {
  return {
    _id: e._id.toString(),
    exerciseId: e.exerciseId.toString(),
    userId: e.userId.toString(),
    date: e.date.toISOString(),
    sets: (e.sets || []).map((s: any) => ({ weight: s.weight, reps: s.reps, rpe: s.rpe ?? null, type: s.type === "drop" ? "drop" : "normal" })),
    unit: e.unit,
    totalVolume: e.totalVolume,
    notes: e.notes || "",
    createdAt: e.createdAt.toISOString(),
  };
}

function validateSets(sets: SetDTO[]): string | null {
  if (!Array.isArray(sets) || sets.length === 0) return "At least one set is required";
  for (const s of sets) {
    if (typeof s.weight !== "number" || s.weight < 0) return "Weight must be a non-negative number";
    if (typeof s.reps !== "number" || s.reps < 0) return "Reps must be a non-negative number";
    if (s.rpe !== null && s.rpe !== undefined && (s.rpe < 0 || s.rpe > 10)) return "RPE must be between 0 and 10";
    if (s.type !== undefined && s.type !== "normal" && s.type !== "drop") return "Set type must be normal or drop";
  }
  return null;
}

// GET /api/logentries?exerciseId=&from=&to=&limit=
export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  // A trainer may read a client's entries via ?athleteId= — only with an active connection.
  let targetUserId = session.user.id;
  const athleteId = searchParams.get("athleteId");
  if (athleteId) {
    if (session.user.role !== "instructor") {
      return NextResponse.json({ error: "Only trainers can view another athlete's entries" }, { status: 403 });
    }
    const connection = await TrainerConnection.findOne({
      trainerId: session.user.id,
      athleteId,
      status: "active",
    });
    if (!connection) {
      return NextResponse.json({ error: "No active connection with this athlete" }, { status: 403 });
    }
    targetUserId = athleteId;
  }

  await dbConnect();
  const filter: Record<string, unknown> = { userId: targetUserId };
  if (exerciseId) filter.exerciseId = exerciseId;
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  if (Object.keys(dateFilter).length) filter.date = dateFilter;

  const entries = (await LogEntry.find(filter).sort({ date: -1 }).limit(limit).lean()) as any[];
  return NextResponse.json(entries.map(toDTO));
}

// POST /api/logentries — athlete only
export async function POST(req: Request) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const body = (await req.json()) as {
    exerciseId?: string;
    date?: string;
    sets?: SetDTO[];
    unit?: "kg" | "lb";
    notes?: string;
  };

  if (!body.exerciseId) return NextResponse.json({ error: "exerciseId is required" }, { status: 400 });
  const setErr = validateSets(body.sets || []);
  if (setErr) return NextResponse.json({ error: setErr }, { status: 400 });

  const sets = body.sets!;
  const totalVolume = computeTotalVolume(sets);

  await dbConnect();
  const entry = await LogEntry.create({
    exerciseId: body.exerciseId,
    userId: session.user.id,
    date: body.date ? new Date(body.date) : new Date(),
    sets,
    unit: body.unit || session.user.unitPreference,
    totalVolume,
    notes: body.notes?.trim() || "",
  });
  return NextResponse.json(toDTO(entry.toObject() as any), { status: 201 });
}
