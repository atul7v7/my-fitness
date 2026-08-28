import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import LogEntry from "@/lib/models/LogEntry";
import Exercise from "@/lib/models/Exercise";
import { requireAuth } from "@/lib/role";

// GET /api/export?format=csv|json — export all of the user's log entries.
export async function GET(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  await dbConnect();
  const entries = (await LogEntry.find({ userId: session.user.id }).sort({ date: 1 }).lean()) as any[];
  const exerciseIds = Array.from(new Set(entries.map((e) => e.exerciseId.toString())));
  const exercises = (exerciseIds.length ? await Exercise.find({ _id: { $in: exerciseIds } }).lean() : []) as any[];
  const exMap = new Map(exercises.map((e) => [e._id.toString(), e.name]));

  const rows = entries.map((e) => ({
    date: e.date.toISOString().slice(0, 10),
    exercise: exMap.get(e.exerciseId.toString()) || "Unknown",
    unit: e.unit,
    sets: e.sets.map((s: any) => `${s.weight}x${s.reps}${s.rpe ? `@${s.rpe}` : ""}`).join(" | "),
    totalVolume: e.totalVolume,
    notes: e.notes || "",
  }));

  if (format === "csv") {
    const header = "date,exercise,unit,sets,totalVolume,notes\n";
    const lines = rows.map((r) =>
      [r.date, `"${r.exercise}"`, r.unit, `"${r.sets}"`, r.totalVolume, `"${r.notes.replace(/"/g, '""')}"`].join(",")
    );
    const csv = header + lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="my-workouts.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(rows, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="my-workouts.json"`,
    },
  });
}
