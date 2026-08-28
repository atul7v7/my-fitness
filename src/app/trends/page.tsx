"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { ExerciseDTO, BodyPartDTO } from "@/lib/types";

export default function TrendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [exRes, bpRes] = await Promise.all([
          fetch("/api/exercises"),
          fetch("/api/bodyparts"),
        ]);
        setExercises(await exRes.json());
        setBodyParts(await bpRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [status, router]);

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-white">Trends</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {/* Per-exercise */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">By Exercise</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : exercises.length === 0 ? (
            <p className="text-slate-500 text-sm">No exercises yet.</p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex) => (
                <Link
                  key={ex._id}
                  href={`/trends/exercise/${ex._id}`}
                  className="block rounded-xl bg-slate-800/60 border border-slate-800 p-3.5 active:scale-[0.99] transition"
                >
                  <span className="font-semibold text-white text-sm">{ex.name}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Per body part */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">By Body Part</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {bodyParts.map((bp) => (
                <Link
                  key={bp._id}
                  href={`/trends/bodypart/${bp._id}`}
                  className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5 text-center active:scale-[0.99] transition"
                >
                  <span className="text-sm text-slate-200">{bp.name}</span>
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
