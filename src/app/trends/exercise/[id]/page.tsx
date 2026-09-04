"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TrendView from "@/components/TrendView";
import { cachedFetch } from "@/lib/api-cache";
import type { ExerciseDTO } from "@/lib/types";

export default function ExerciseTrendPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseDTO | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    cachedFetch(`/api/exercises/${params.id}`)
      .then((r) => r.json())
      .then(setExercise);
  }, [status, params.id, router]);

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/trends" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white flex-1 truncate">
            {exercise?.name || "Trend"}
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <TrendView
          fetchUrl={`/api/trends/exercise/${params.id}?`}
          title={exercise?.name || ""}
        />
      </main>
    </div>
  );
}
