"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { cachedFetch } from "@/lib/api-cache";
import type { ExerciseDTO, BodyPartDTO } from "@/lib/types";

export default function TrendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [exRes, bpRes] = await Promise.all([
          cachedFetch("/api/exercises"),
          cachedFetch("/api/bodyparts"),
        ]);
        setExercises(await exRes.json());
        setBodyParts(await bpRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [status, router]);

  const selectedPart = bodyParts.find((b) => b._id === selectedBodyPart);
  const partExercises = selectedBodyPart
    ? exercises.filter((ex) => ex.bodyParts.includes(selectedBodyPart))
    : exercises;

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-white">Trends</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pick a body part, then drill into each exercise.</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {/* Body part chips */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">1 · Choose Body Part</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {bodyParts.map((bp) => {
                const active = bp._id === selectedBodyPart;
                const count = exercises.filter((ex) => ex.bodyParts.includes(bp._id)).length;
                return (
                  <button
                    key={bp._id}
                    onClick={() => setSelectedBodyPart(active ? "" : bp._id)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-[0.98] ${
                      active
                        ? "bg-brand-600 border-brand-600 text-white"
                        : "bg-slate-800/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    {bp.name}
                    <span className={`ml-1.5 text-[11px] ${active ? "text-brand-100" : "text-slate-500"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Exercises for the chosen body part */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            2 · {selectedBodyPart ? `Exercises · ${selectedPart?.name}` : "Choose a body part above"}
          </h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : !selectedBodyPart ? (
            <p className="text-slate-600 text-sm">Select a body part to see trend analysis for each exercise you have done.</p>
          ) : partExercises.length === 0 ? (
            <p className="text-slate-500 text-sm">No exercises tagged under {selectedPart?.name} yet.</p>
          ) : (
            <div className="space-y-2">
              {partExercises.map((ex) => (
                <Link
                  key={ex._id}
                  href={`/trends/exercise/${ex._id}`}
                  className="flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-800 px-3.5 py-3 active:scale-[0.99] transition"
                >
                  <span className="font-semibold text-white text-sm">{ex.name}</span>
                  <span className="text-xs text-brand-400 font-medium">Trend →</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Direct body-part breakdown view */}
        {selectedBodyPart && (
          <section>
            <Link
              href={`/trends/bodypart/${selectedBodyPart}`}
              className="flex items-center justify-between rounded-xl bg-brand-600/15 border border-brand-600/40 px-4 py-3.5 active:scale-[0.99] transition"
            >
              <span className="text-sm text-brand-200 font-medium">
                View all {selectedPart?.name} exercises together
              </span>
              <span className="text-sm text-brand-300">→</span>
            </Link>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
