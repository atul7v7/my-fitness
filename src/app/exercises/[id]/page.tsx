"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ExerciseDTO, LogEntryDTO } from "@/lib/types";

export default function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseDTO | null>(null);
  const [entries, setEntries] = useState<LogEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status !== "authenticated") return;
    (async () => {
      try {
        const [exRes, logRes] = await Promise.all([
          fetch(`/api/exercises/${params.id}`),
          fetch(`/api/logentries?exerciseId=${params.id}&limit=50`),
        ]);
        if (exRes.ok) setExercise(await exRes.json());
        if (logRes.ok) setEntries(await logRes.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [status, params.id, router]);

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const isAthlete = session.user.role === "athlete";

  async function handleUploadVideo(file: File) {
    setUploading(true);
    setError("");
    try {
      const sigRes = await fetch("/api/upload-signature?folder=fitness-videos");
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const sig = await sigRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("timestamp", sig.timestamp);
      formData.append("signature", sig.signature);
      formData.append("api_key", sig.api_key);
      formData.append("folder", sig.folder);
      formData.append("resource_type", sig.resource_type);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/video/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();

      const saveRes = await fetch(`/api/video/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secure_url: uploadData.secure_url, public_id: uploadData.public_id }),
      });
      if (saveRes.ok) {
        const updated = await saveRes.json();
        setExercise((prev) => prev ? { ...prev, videoUrl: updated.videoUrl, videoPublicId: updated.videoPublicId, videoUploadedAt: updated.videoUploadedAt } : prev);
      } else {
        throw new Error("Failed to save video metadata");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteVideo() {
    if (!confirm("Delete this video?")) return;
    const res = await fetch(`/api/video/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      setExercise((prev) => prev ? { ...prev, videoUrl: null, videoPublicId: null, videoUploadedAt: null, videoUploadedBy: null } : prev);
    }
  }

  async function handleDeleteExercise() {
    if (!confirm("Delete this exercise and all its log entries?")) return;
    const res = await fetch(`/api/exercises/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/exercises");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  if (!exercise) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Exercise not found</p></div>;
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/exercises" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white flex-1 truncate">{exercise.name}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* Description */}
        {exercise.description && (
          <p className="text-sm text-slate-400">{exercise.description}</p>
        )}

        {/* Body parts */}
        {exercise.bodyPartNames && exercise.bodyPartNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {exercise.bodyPartNames.map((bp, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {bp}
              </span>
            ))}
          </div>
        )}

        {/* Video */}
        <section className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Demo Video</h2>
          {exercise.videoUrl ? (
            <div className="space-y-3">
              <video src={exercise.videoUrl} controls className="w-full rounded-xl" />
              {isAthlete && (
                <button
                  onClick={handleDeleteVideo}
                  className="text-xs text-red-400 font-medium"
                >
                  Delete video
                </button>
              )}
            </div>
          ) : (
            <label className="block">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadVideo(f); }}
              />
              <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-slate-700 text-slate-500">
                <span className="text-2xl mb-1">🎬</span>
                <span className="text-sm">{uploading ? "Uploading..." : "Tap to upload video"}</span>
              </div>
            </label>
          )}
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </section>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/log/new?exerciseId=${exercise._id}`}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold text-center active:scale-[0.98] transition"
          >
            Log Workout
          </Link>
          <Link
            href={`/trends/exercise/${exercise._id}`}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold text-center border border-slate-700 active:scale-[0.98] transition"
          >
            View Trends
          </Link>
        </div>

        {/* History */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">History</h2>
          {entries.length === 0 ? (
            <p className="text-slate-500 text-sm">No workouts logged yet.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div key={e._id} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">
                      {new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="text-xs text-slate-400">{e.totalVolume} {e.unit}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {e.sets.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-slate-700/60 text-slate-300">
                        {s.weight}×{s.reps}{s.rpe ? `@{s.rpe}` : ""}
                      </span>
                    ))}
                  </div>
                  {e.notes && <p className="text-xs text-slate-500 mt-2">{e.notes}</p>}
                  {isAthlete && (
                    <Link href={`/log/${e._id}/edit`} className="text-xs text-brand-400 mt-2 inline-block">
                      Edit
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Delete exercise (athlete only) */}
        {isAthlete && (
          <button
            onClick={handleDeleteExercise}
            className="w-full py-2.5 rounded-xl bg-red-900/30 text-red-400 text-sm font-medium border border-red-900/50"
          >
            Delete Exercise
          </button>
        )}
      </main>
    </div>
  );
}
