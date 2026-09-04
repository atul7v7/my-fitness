"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { TrainerDTO, ConnectionDTO } from "@/lib/types";
import { cachedFetch, invalidateCache } from "@/lib/api-cache";

export default function TrainerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trainers, setTrainers] = useState<TrainerDTO[]>([]);
  const [connections, setConnections] = useState<ConnectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    if (session.user.role !== "athlete") {
      router.push("/dashboard");
      return;
    }
    (async () => {
      try {
        const [tRes, cRes] = await Promise.all([
          cachedFetch("/api/trainers"),
          cachedFetch("/api/connections"),
        ]);
        if (tRes.ok) setTrainers(await tRes.json());
        if (cRes.ok) setConnections(await cRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session, router]);

  if (status !== "authenticated" || session?.user.role !== "athlete") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const connectionByTrainer = new Map(connections.map((c) => [c.trainerId, c]));

  async function requestTrainer(trainerId: string) {
    setBusyId(trainerId);
    setError("");
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId }),
    });
    setBusyId(null);
    if (res.ok) {
      invalidateCache("/api/connections");
      const c: ConnectionDTO = await res.json();
      setConnections((prev) => [c, ...prev]);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to send request");
    }
  }

  async function disconnect(connectionId: string) {
    if (!confirm("Disconnect from this trainer? They will no longer see your activity.")) return;
    setBusyId(connectionId);
    setError("");
    const res = await fetch(`/api/connections/${connectionId}`, { method: "DELETE" });
    setBusyId(null);
    if (res.ok) {
      invalidateCache("/api/connections");
      setConnections((prev) => prev.filter((c) => c._id !== connectionId));
    } else {
      const data = await res.json();
      setError(data.error || "Failed to disconnect");
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">My Trainer</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Current / pending connections */}
        {connections.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Your Connections</h2>
            <div className="space-y-2">
              {connections.map((c) => (
                <div key={c._id} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-300 font-bold shrink-0">
                        {c.trainerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{c.trainerName}</p>
                        <p className="text-xs text-slate-400 truncate">{c.trainerEmail}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      c.status === "active" ? "bg-green-600/20 text-green-300" : "bg-amber-600/20 text-amber-300"
                    }`}>
                      {c.status === "active" ? "Connected" : "Pending"}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect(c._id)}
                    disabled={busyId === c._id}
                    className="text-xs text-red-400 mt-2 disabled:opacity-50"
                  >
                    {c.status === "active" ? "Disconnect" : "Cancel request"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available trainers */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Available Trainers</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : trainers.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-slate-800/50 border border-slate-800">
              <p className="text-slate-400 text-sm">No trainers available yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainers.map((t) => {
                const conn = connectionByTrainer.get(t._id);
                return (
                  <div key={t._id} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate">{t.name}</p>
                          <p className="text-xs text-slate-400 truncate">{t.email}</p>
                        </div>
                      </div>
                      {!conn && (
                        <button
                          onClick={() => requestTrainer(t._id)}
                          disabled={busyId === t._id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white font-medium whitespace-nowrap disabled:opacity-50"
                        >
                          {busyId === t._id ? "..." : "Request"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500 text-center">
          Once a trainer approves your request, they can view your workout history.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
