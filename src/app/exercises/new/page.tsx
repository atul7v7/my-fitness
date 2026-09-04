"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BodyPartDTO } from "@/lib/types";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

export default function NewExercisePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bodyParts, setBodyParts] = useState<BodyPartDTO[]>([]);
  const [selectedBps, setSelectedBps] = useState<string[]>([]);
  const [newBpName, setNewBpName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    if (session.user.role !== "athlete") {
      router.push("/exercises");
      return;
    }
    cachedFetch("/api/bodyparts")
      .then((r) => r.json())
      .then(setBodyParts);
  }, [status, session, router]);

  if (status !== "authenticated" || session?.user.role !== "athlete") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  function toggleBp(id: string) {
    setSelectedBps((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  async function addCustomBp() {
    if (!newBpName.trim()) return;
    const res = await fetch("/api/bodyparts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBpName.trim() }),
    });
    if (res.ok) {
      invalidateCache("/api/bodyparts");
      const bp = await res.json();
      setBodyParts((prev) => [...prev, bp].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedBps((prev) => [...prev, bp._id]);
      setNewBpName("");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add body part");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, bodyParts: selectedBps }),
    });
    setSaving(false);
    if (res.ok) {
      invalidateCache("/api/exercises");
      router.push("/exercises");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create exercise");
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/exercises" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">New Exercise</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              placeholder="e.g. Barbell Bench Press"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
              placeholder="Form cues, setup notes..."
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Body Parts</label>
            <div className="flex flex-wrap gap-2">
              {bodyParts.map((bp) => (
                <button
                  key={bp._id}
                  type="button"
                  onClick={() => toggleBp(bp._id)}
                  className={`text-xs px-3 py-2 rounded-full transition ${
                    selectedBps.includes(bp._id)
                      ? "bg-brand-600 text-white"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {bp.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={newBpName}
                onChange={(e) => setNewBpName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomBp(); } }}
                placeholder="Add custom body part..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={addCustomBp}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium"
              >
                Add
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Exercise"}
          </button>
        </form>
      </main>
    </div>
  );
}
