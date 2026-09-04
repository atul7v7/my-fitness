"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BodyPartDTO, ExerciseDTO, SuggestionDTO, SetDTO } from "@/lib/types";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";
import { queueLogEntry } from "@/lib/offline-sync";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LogNewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("exerciseId");
  const preselectedDate = searchParams.get("date");

  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([]);
  const [bodyPartId, setBodyPartId] = useState("");
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [exerciseId, setExerciseId] = useState(preselectedId || "");
  const [date, setDate] = useState(preselectedDate || localToday());
  const [sets, setSets] = useState<SetDTO[]>([{ weight: 0, reps: 0, rpe: null }]);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [notes, setNotes] = useState("");
  const [suggestion, setSuggestion] = useState<SuggestionDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    if (session.user.role !== "athlete") {
      router.push("/dashboard");
      return;
    }
    setUnit(session.user.unitPreference);
    Promise.all([
      cachedFetch("/api/bodyparts").then((r) => r.json()),
      cachedFetch("/api/exercises").then((r) => r.json()),
    ]).then(([bps, exs]) => {
      setBodyParts(bps);
      setExercises(exs);
      // Arriving with ?exerciseId= — preselect that exercise's body part.
      if (preselectedId) {
        const pre = (exs as ExerciseDTO[]).find((e) => e._id === preselectedId);
        if (pre?.bodyParts.length) setBodyPartId(pre.bodyParts[0]);
      }
    });
  }, [status, session, router, preselectedId, preselectedDate]);

  // Fetch suggestion when exercise changes.
  useEffect(() => {
    if (!exerciseId) {
      setSuggestion(null);
      return;
    }
    cachedFetch(`/api/logentries/suggestion?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data) => setSuggestion(data.suggestion));
  }, [exerciseId]);

  if (status !== "authenticated" || session?.user.role !== "athlete") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  function updateSet(i: number, field: keyof SetDTO, value: string) {
    setSets((prev) => {
      const next = [...prev];
      if (field === "rpe") {
        next[i] = { ...next[i], rpe: value === "" ? null : Number(value) };
      } else {
        next[i] = { ...next[i], [field]: Number(value) };
      }
      return next;
    });
  }

  function addSet() {
    setSets((prev) => [...prev, { weight: 0, reps: 0, rpe: null }]);
  }

  function addDropSet() {
    setSets((prev) => [...prev, { weight: 0, reps: 0, rpe: null, type: "drop" }]);
  }

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  function applySuggestion() {
    if (suggestion) {
      setSets(suggestion.suggestedSets.map((s) => ({ ...s })));
      setUnit(suggestion.unit);
    }
  }

  // Exercises visible for the chosen body part (empty selection = all).
  const filteredExercises = bodyPartId
    ? exercises.filter((ex) => ex.bodyParts.includes(bodyPartId))
    : exercises;

  function handleBodyPartChange(id: string) {
    setBodyPartId(id);
    if (!exerciseId) return;
    const current = exercises.find((ex) => ex._id === exerciseId);
    const stillVisible = id === "" || (current?.bodyParts.includes(id) ?? false);
    if (!stillVisible) {
      setExerciseId("");
      setSuggestion(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!exerciseId) {
      setError("Please select an exercise");
      return;
    }
    const validSets = sets.filter((s) => s.weight > 0 || s.reps > 0);
    if (validSets.length === 0) {
      setError("Add at least one set with weight or reps");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      exerciseId,
      date,
      sets: validSets,
      unit,
      notes,
    };

    try {
      const res = await fetch("/api/logentries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        invalidateCache("/api/logentries");
        invalidateCache("/api/trends");
        router.push(`/exercises/${exerciseId}`);
      } else if (!navigator.onLine) {
        // Offline — queue for later sync.
        await queueLogEntry(payload);
        setQueued(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      // Network error — queue for later sync.
      await queueLogEntry(payload);
      setQueued(true);
    } finally {
      setSaving(false);
    }
  }

  if (queued) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <span className="text-4xl mb-3 block">📡</span>
          <h1 className="text-lg font-bold text-white mb-1">Saved offline</h1>
          <p className="text-sm text-slate-400 mb-6">Your entry will sync when you're back online.</p>
          <Link href="/dashboard" className="inline-block px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">Log Workout</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Body part selector — filters the exercise list */}
          {bodyParts.length > 0 && (
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Body Part</label>
              <select
                value={bodyPartId}
                onChange={(e) => handleBodyPartChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">All body parts</option>
                {bodyParts.map((bp) => (
                  <option key={bp._id} value={bp._id}>{bp.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Exercise selector */}
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Exercise</label>
            {exercises.length === 0 ? (
              <div className="text-center py-4 rounded-xl bg-slate-800/50 border border-slate-800">
                <p className="text-slate-400 text-sm mb-2">No exercises yet.</p>
                <Link href="/exercises/new" className="text-brand-400 text-sm font-medium">Create one →</Link>
              </div>
            ) : (
              <>
                <select
                  value={exerciseId}
                  onChange={(e) => setExerciseId(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select exercise...</option>
                  {filteredExercises.map((ex) => (
                    <option key={ex._id} value={ex._id}>{ex.name}</option>
                  ))}
                </select>
                {bodyPartId && filteredExercises.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1.5">
                    No exercises for this body part yet — <Link href="/exercises/new" className="underline">create one</Link> or pick another body part.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Suggestion */}
          {suggestion && (
            <div className="rounded-xl bg-brand-600/10 border border-brand-600/30 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-brand-300 mb-0.5">💡 SUGGESTION</p>
                  <p className="text-sm text-slate-200">{suggestion.message}</p>
                </div>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Unit toggle */}
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  unit === u ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Sets */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Sets</label>
            <div className="space-y-2">
              {sets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  {s.type === "drop" ? (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1 py-0.5 w-10 text-center shrink-0">DROP</span>
                  ) : (
                    <span className="text-xs text-slate-500 w-10 text-center shrink-0">#{i + 1}</span>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    value={s.weight || ""}
                    onChange={(e) => updateSet(i, "weight", e.target.value)}
                    placeholder="Wt"
                    className="w-20 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm text-center focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-xs text-slate-500">{unit}</span>
                  <span className="text-slate-600">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={s.reps || ""}
                    onChange={(e) => updateSet(i, "reps", e.target.value)}
                    placeholder="Reps"
                    className="w-16 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm text-center focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    max="10"
                    value={s.rpe ?? ""}
                    onChange={(e) => updateSet(i, "rpe", e.target.value)}
                    placeholder="RPE"
                    className="w-16 px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm text-center focus:outline-none focus:border-brand-500"
                  />
                  {sets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(i)}
                      className="text-red-400 text-lg px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={addSet}
                className="text-sm text-brand-400 font-medium"
              >
                + Add Set
              </button>
              <button
                type="button"
                onClick={addDropSet}
                className="text-sm text-amber-400 font-medium"
              >
                + Add Drop Set
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
              placeholder="How did it feel?"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !exerciseId}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function LogNewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>}>
      <LogNewContent />
    </Suspense>
  );
}
