import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LogEntry from "@/lib/models/LogEntry";
import { requireRole } from "@/lib/role";
import { computeTotalVolume } from "@/lib/suggestions";
import type { SetDTO } from "@/lib/types";

function toDTO(e: any) {
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

// PUT /api/logentries/[id] — athlete only
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const body = (await req.json()) as {
    date?: string;
    sets?: SetDTO[];
    unit?: "kg" | "lb";
    notes?: string;
  };

  const sets = body.sets || [];
  if (!sets.length) return NextResponse.json({ error: "At least one set is required" }, { status: 400 });
  for (const s of sets) {
    if (typeof s.weight !== "number" || s.weight < 0) return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    if (typeof s.reps !== "number" || s.reps < 0) return NextResponse.json({ error: "Invalid reps" }, { status: 400 });
    if (s.type !== undefined && s.type !== "normal" && s.type !== "drop") return NextResponse.json({ error: "Set type must be normal or drop" }, { status: 400 });
  }

  await dbConnect();
  const entry = await LogEntry.findOneAndUpdate(
    { _id: params.id, userId: session.user.id },
    {
      $set: {
        ...(body.date ? { date: new Date(body.date) } : {}),
        sets,
        unit: body.unit || session.user.unitPreference,
        totalVolume: computeTotalVolume(sets),
        notes: body.notes?.trim() || "",
      },
    },
    { new: true }
  ).lean() as any;
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toDTO(entry));
}

// DELETE /api/logentries/[id] — athlete only
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole("athlete");
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  await dbConnect();
  const entry = await LogEntry.findOneAndDelete({ _id: params.id, userId: session.user.id });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
