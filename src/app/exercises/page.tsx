"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { cachedFetch } from "@/lib/api-cache";
import type { ExerciseDTO, BodyPartDTO } from "@/lib/types";

export default function ExercisesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([]);
  const [search, setSearch] = useState("");
  const [filterBp, setFilterBp] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
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

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const isAthlete = session.user.role === "athlete";

  const filtered = exercises.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterBp && !e.bodyParts.includes(filterBp)) return false;
    return true;
  });

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Exercises</h1>
          {isAthlete && (
            <Link href="/exercises/new" className="text-sm text-brand-400 font-medium">
              + New
            </Link>
          )}
        </div>
        <div className="px-4 pb-3 space-y-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterBp("")}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${
                !filterBp ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              All
            </button>
            {bodyParts.map((bp) => (
              <button
                key={bp._id}
                onClick={() => setFilterBp(bp._id)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${
                  filterBp === bp._id ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {bp.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
            <p className="text-slate-400 text-sm">No exercises found.</p>
            {isAthlete && (
              <Link href="/exercises/new" className="inline-block mt-3 text-brand-400 text-sm font-medium">
                Create one →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <Link
                key={ex._id}
                href={`/exercises/${ex._id}`}
                className="block rounded-xl bg-slate-800/60 border border-slate-800 p-3.5 active:scale-[0.99] transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{ex.name}</span>
                  {ex.videoUrl && <span className="text-xs">🎬</span>}
                </div>
                {ex.bodyPartNames && ex.bodyPartNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {ex.bodyPartNames.map((bp, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400">
                        {bp}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
