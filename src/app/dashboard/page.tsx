"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { LogEntryDTO, ExerciseDTO } from "@/lib/types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<LogEntryDTO[]>([]);
  const [exercises, setExercises] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      try {
        const [logRes, exRes] = await Promise.all([
          fetch("/api/logentries?limit=20"),
          fetch("/api/exercises"),
        ]);
        const logs = await logRes.json();
        const exs: ExerciseDTO[] = await exRes.json();
        setEntries(logs);
        setExercises(Object.fromEntries(exs.map((e) => [e._id, e.name])));
      } finally {
        setLoading(false);
      }
    })();
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const isAthlete = session.user.role === "athlete";

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Welcome back</p>
            <h1 className="text-lg font-bold text-white">{session.user.name}</h1>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isAthlete ? "bg-brand-600/20 text-brand-300" : "bg-amber-600/20 text-amber-300"
          }`}>
            {isAthlete ? "Athlete" : "Instructor"}
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
              href="/exercises/new"
              className="flex flex-col items-center justify-center py-5 rounded-2xl bg-slate-800 text-white font-semibold active:scale-[0.98] transition border border-slate-700"
            >
              <span className="text-2xl mb-1">🏋️</span>
              <span className="text-sm">New Exercise</span>
            </Link>
          </div>
        )}

        {/* Recent workouts */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Recent Workouts
          </h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
              <p className="text-slate-400 text-sm">No workouts logged yet.</p>
              {isAthlete && (
                <Link href="/log/new" className="inline-block mt-3 text-brand-400 text-sm font-medium">
                  Log your first workout →
                </Link>
              )}
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
                      <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                        {s.weight}×{s.reps}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
