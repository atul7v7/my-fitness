"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PerExerciseTrendPanel } from "@/components/TrendView";
import { cachedFetch } from "@/lib/api-cache";
import type { BodyPartDTO, BodyPartTrendResult } from "@/lib/types";

const EXERCISE_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#a78bfa"];

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 0 },
];

export default function BodyPartTrendPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bodyPart, setBodyPart] = useState<BodyPartDTO | null>(null);
  const [result, setResult] = useState<BodyPartTrendResult | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    cachedFetch("/api/bodyparts")
      .then((r) => r.json())
      .then((bps: BodyPartDTO[]) => {
        setBodyPart(bps.find((b) => b._id === params.id) || null);
      });
  }, [status, params.id, router]);

  useEffect(() => {
    setLoading(true);
    let url = `/api/trends/bodypart/${params.id}?`;
    if (range > 0) {
      const from = new Date();
      from.setDate(from.getDate() - range);
      url += `&from=${from.toISOString().slice(0, 10)}`;
    }
    cachedFetch(url)
      .then((r) => r.json())
      .then((d: BodyPartTrendResult) => setResult(d))
      .finally(() => setLoading(false));
  }, [params.id, range]);

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/trends" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white flex-1 truncate">
            {bodyPart?.name || "Body Part"} Trends
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                range === r.days ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm text-center py-8">Loading trends...</p>
        ) : !result || result.breakdown.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
            <p className="text-slate-400 text-sm mb-1">No workouts for this body part in the selected range.</p>
            <p className="text-xs text-slate-500">
              {result && result.totalExercises > 0
                ? `${result.totalExercises} exercise${result.totalExercises > 1 ? "s" : ""} tagged — log one to see its trend.`
                : "No exercises tagged yet."}
            </p>
          </div>
        ) : (
          <>
            {result.loggedExercises > 0 && result.totalExercises > result.loggedExercises && (
              <p className="text-xs text-slate-500 text-center">
                Showing trends for {result.loggedExercises} of {result.totalExercises} exercises with logged workouts.
              </p>
            )}
            <div className="space-y-4">
              {result.breakdown.map((item, i) => (
                <PerExerciseTrendPanel
                  key={item.exerciseId}
                  name={item.name}
                  linkHref={`/trends/exercise/${item.exerciseId}`}
                  trend={item.trend}
                  exerciseColor={EXERCISE_COLORS[i % EXERCISE_COLORS.length]}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
