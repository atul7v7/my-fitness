"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LogEntryDTO, SetDTO } from "@/lib/types";

export default function EditLogPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entry, setEntry] = useState<LogEntryDTO | null>(null);
  const [date, setDate] = useState("");
  const [sets, setSets] = useState<SetDTO[]>([]);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    if (session.user.role !== "athlete") {
      router.push("/dashboard");
      return;
    }
    fetch(`/api/logentries?limit=200`)
      .then((r) => r.json())
      .then((data: LogEntryDTO[]) => {
        const found = data.find((e) => e._id === params.id);
        if (found) {
          setEntry(found);
          setDate(found.date.slice(0, 10));
          setSets(found.sets.map((s) => ({ ...s })));
          setUnit(found.unit);
          setNotes(found.notes);
        }
      })
      .finally(() => setLoading(false));
  }, [status, session, params.id, router]);

  if (status !== "authenticated" || session?.user.role !== "athlete") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  if (!entry) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Entry not found</p></div>;
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

  function removeSet(i: number) {
    setSets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validSets = sets.filter((s) => s.weight > 0 || s.reps > 0);
    if (validSets.length === 0) {
      setError("Add at least one set");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/logentries/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, sets: validSets, unit, notes }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/exercises/${entry!.exerciseId}`);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update");
    }
  };

  async function handleDelete() {
    if (!confirm("Delete this log entry?")) return;
    const res = await fetch(`/api/logentries/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/exercises/${entry!.exerciseId}`);
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/exercises/${entry.exerciseId}`} className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">Edit Entry</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
            />
          </div>

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

          <div>
            <label className="block text-sm text-slate-300 mb-2">Sets</label>
            <div className="space-y-2">
              {sets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-6">#{i + 1}</span>
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
                    <button type="button" onClick={() => removeSet(i)} className="text-red-400 text-lg px-1">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addSet} className="mt-2 text-sm text-brand-400 font-medium">+ Add Set</button>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Entry"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-2.5 rounded-xl bg-red-900/30 text-red-400 text-sm font-medium border border-red-900/50"
          >
            Delete Entry
          </button>
        </form>
      </main>
    </div>
  );
}
