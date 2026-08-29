import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TrainerConnection from "@/lib/models/TrainerConnection";
import { requireAuth } from "@/lib/role";

// PUT /api/connections/[id] — instructor approves or rejects a pending request { action: "approve" | "reject" }
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;
  if (session.user.role !== "instructor") {
    return NextResponse.json({ error: "Only trainers can respond to requests" }, { status: 403 });
  }

  const body = (await req.json()) as { action?: string };
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  await dbConnect();
  const connection = await TrainerConnection.findOne({ _id: params.id, trainerId: session.user.id });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (connection.status !== "pending") {
    return NextResponse.json({ error: "This request was already handled" }, { status: 409 });
  }

  if (body.action === "approve") {
    connection.status = "active";
    await connection.save();
    return NextResponse.json({ ok: true, status: "active" });
  }

  await connection.deleteOne();
  return NextResponse.json({ ok: true, status: "rejected" });
}

// DELETE /api/connections/[id] — athlete cancels their request or disconnects; trainer can also remove a client.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  const session = guard;

  await dbConnect();
  const filter =
    session.user.role === "instructor"
      ? { _id: params.id, trainerId: session.user.id }
      : { _id: params.id, athleteId: session.user.id };
  const connection = await TrainerConnection.findOneAndDelete(filter);
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
