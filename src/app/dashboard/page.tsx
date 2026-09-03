"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { LogEntryDTO, ExerciseDTO, ConnectionDTO } from "@/lib/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<LogEntryDTO[]>([]);
  const [exercises, setExercises] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<ConnectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const isInstructor = session?.user.role === "instructor";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      try {
        if (session.user.role === "instructor") {
          const cRes = await fetch("/api/connections");
          if (cRes.ok) setConnections(await cRes.json());
        } else {
          const [logRes, exRes] = await Promise.all([
            fetch("/api/logentries?limit=20"),
            fetch("/api/exercises"),
          ]);
          const logs = await logRes.json();
          const exs: ExerciseDTO[] = await exRes.json();
          setEntries(logs);
          setExercises(Object.fromEntries(exs.map((e) => [e._id, e.name])));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const isAthlete = session.user.role === "athlete";
  const pendingRequests = connections.filter((c) => c.status === "pending");
  const activeClients = connections.filter((c) => c.status === "active");

  async function respond(connectionId: string, action: "approve" | "reject") {
    const res = await fetch(`/api/connections/${connectionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setConnections((prev) =>
        action === "approve"
          ? prev.map((c) => (c._id === connectionId ? { ...c, status: "active" as const } : c))
          : prev.filter((c) => c._id !== connectionId)
      );
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Fitness Training by Ashwani</p>
            <h1 className="text-lg font-bold text-white">{session.user.name}</h1>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isAthlete ? "bg-brand-600/20 text-brand-300" : "bg-amber-600/20 text-amber-300"
          }`}>
            {isAthlete ? "Athlete" : "Trainer"}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {/* Quick actions */}
        {isAthlete && (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/log/new"
              className="flex flex-col items-center justify-center py-5 rounded-2xl bg-brand-600 text-white font-semibold active:scale-[0.98] transition"
            >
              <span className="text-2xl mb-1">➕</span>
              <span className="text-sm">Log Workout</span>
            </Link>
            <Link
              href="/trainer"
              className="flex flex-col items-center justify-center py-5 rounded-2xl bg-slate-800 text-white font-semibold active:scale-[0.98] transition border border-slate-700"
            >
              <span className="text-2xl mb-1">🧑‍🏫</span>
              <span className="text-sm">My Trainer</span>
            </Link>
          </div>
        )}

        {/* Trainer view: pending requests + clients */}
        {isInstructor && (
          <>
            {pendingRequests.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Pending Requests ({pendingRequests.length})
                </h2>
                <div className="space-y-2">
                  {pendingRequests.map((c) => (
                    <div key={c._id} className="rounded-xl bg-amber-600/10 border border-amber-600/30 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{c.athleteName}</p>
                          <p className="text-xs text-slate-400 truncate">{c.athleteEmail}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => respond(c._id, "approve")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => respond(c._id, "reject")}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">My Clients</h2>
              {loading ? (
                <p className="text-slate-500 text-sm">Loading...</p>
              ) : activeClients.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
                  <p className="text-slate-400 text-sm">No clients yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Athletes can send you a connection request from their My Trainer page.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeClients.map((c) => (
                    <Link
                      key={c._id}
                      href={`/clients/${c.athleteId}`}
                      className="flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-800 p-3.5 active:scale-[0.99] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                          {c.athleteName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{c.athleteName}</p>
                          <p className="text-xs text-slate-400 truncate">{c.athleteEmail}</p>
                        </div>
                      </div>
                      <span className="text-xs text-brand-400 shrink-0">View →</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Athlete view: recent workouts */}
        {isAthlete && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Recent Workouts</h2>
              <Link href="/calendar" className="text-xs text-brand-400 font-medium">📅 Calendar</Link>
            </div>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
                <p className="text-slate-400 text-sm">No workouts logged yet.</p>
                <Link href="/log/new" className="inline-block mt-3 text-brand-400 text-sm font-medium">
                  Log your first workout →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((e) => (
                  <Link
                    key={e._id}
                    href={`/exercises/${e.exerciseId}`}
                    className="block rounded-xl bg-slate-800/60 border border-slate-800 p-3.5 active:scale-[0.99] transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white text-sm">
                        {exercises[e.exerciseId] || "Unknown"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{e.sets.length} sets</span>
                      <span>·</span>
                      <span>{e.totalVolume} {e.unit} volume</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.sets.map((s, i) => (
                        <span
                          key={i}
                          className={`text-[11px] px-1.5 py-0.5 rounded ${
                            s.type === "drop"
                              ? "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                              : "bg-slate-700/60 text-slate-300"
                          }`}
                        >
                          {s.type === "drop" ? "Drop " : ""}{s.weight}×{s.reps}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
