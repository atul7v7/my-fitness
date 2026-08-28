import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import type { Session } from "next-auth";

type Role = "athlete" | "instructor";

/**
 * Reusable server-side role guard. Call at the top of every mutating API route.
 * Returns the session (with user id + role) if the caller has the required role,
 * otherwise returns a NextResponse that the handler should return immediately.
 *
 * Usage:
 *   const guard = await requireRole("athlete");
 *   if (guard instanceof NextResponse) return guard;
 *   const session = guard; // session.user.role === "athlete"
 */
export async function requireRole(
  role: Role
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== role) {
    return NextResponse.json(
      { error: "Forbidden: this action requires the " + role + " role" },
      { status: 403 }
    );
  }
  return session as Session;
}

/** Convenience: require any authenticated user (read or write). */
export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as Session;
}
