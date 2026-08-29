import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainerConnection from "@/lib/models/TrainerConnection";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/role";
import type { ConnectionDTO } from "@/lib/types";

function toDTO(c: any, trainer: any, athlete: any): ConnectionDTO {
  return {
    _id: c._id.toString(),
    trainerId: c.trainerId.toString(),
    trainerName: trainer?.name || "Unknown",
    trainerEmail: trainer?.email || "",
    athleteId: c.athleteId.toString(),
    athleteName: athlete?.name || "Unknown",
    athleteEmail: athlete?.email || "",
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /api/connections — athlete: their trainer connections; instructor: their client connections.
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;
  const isInstructor = session.user.role === "instructor";

  await dbConnect();
  const filter = isInstructor ? { trainerId: session.user.id } : { athleteId: session.user.id };
  const connections = await TrainerConnection.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [
    ...new Set(connections.flatMap((c: any) => [c.trainerId.toString(), c.athleteId.toString()])),
  ];
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));

  return NextResponse.json(
    connections.map((c: any) =>
      toDTO(c, userMap[c.trainerId.toString()], userMap[c.athleteId.toString()])
    )
  );
}

// POST /api/connections — athlete requests a trainer { trainerId }
export async function POST(req: Request) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;
  if (session.user.role !== "athlete") {
    return NextResponse.json({ error: "Only athletes can request a trainer" }, { status: 403 });
  }

  const body = (await req.json()) as { trainerId?: string };
  if (!body.trainerId) {
    return NextResponse.json({ error: "trainerId is required" }, { status: 400 });
  }

  await dbConnect();
  const trainer = await User.findOne({ _id: body.trainerId, role: "instructor" });
  if (!trainer) {
    return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
  }

  const existing = await TrainerConnection.findOne({
    athleteId: session.user.id,
    trainerId: body.trainerId,
  });
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "active" ? "Already connected to this trainer" : "Request already pending" },
      { status: 409 }
    );
  }

  const connection = await TrainerConnection.create({
    athleteId: session.user.id,
    trainerId: body.trainerId,
    status: "pending",
  });
  return NextResponse.json(
    toDTO(connection.toObject(), trainer, { name: session.user.name, email: session.user.email }),
    { status: 201 }
  );
}
