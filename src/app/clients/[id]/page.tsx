"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ExerciseDTO, LogEntryDTO } from "@/lib/types";
import { cachedFetch } from "@/lib/api-cache";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<LogEntryDTO[]>([]);
  const [exercises, setExercises] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    if (session.user.role !== "instructor") {
      router.push("/dashboard");
      return;
    }
    (async () => {
      try {
        const [logRes, exRes] = await Promise.all([
          cachedFetch(`/api/logentries?athleteId=${params.id}&limit=50`),
          cachedFetch("/api/exercises"),
        ]);
        if (!logRes.ok) {
          const data = await logRes.json();
          setError(data.error || "Failed to load client activity");
          return;
        }
        const logs: LogEntryDTO[] = await logRes.json();
        setEntries(logs);
        const exs: ExerciseDTO[] = await exRes.json();
        setExercises(Object.fromEntries(exs.map((e) => [e._id, e.name])));
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, params.id, router]);

  if (status !== "authenticated" || session?.user.role !== "instructor") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">Client Activity</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Workouts</h2>
          {entries.length === 0 ? (
            <p className="text-slate-500 text-sm">No workouts logged yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e._id} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5">
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
                  {e.notes && <p className="text-xs text-slate-500 mt-2">{e.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
