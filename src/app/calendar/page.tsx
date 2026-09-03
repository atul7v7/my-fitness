"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import type { ExerciseDTO, LogEntryDTO } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Deterministic color per body part name (same name → same color everywhere).
function bodyPartColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const [entries, setEntries] = useState<LogEntryDTO[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<string, ExerciseDTO>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Month metadata computed in UTC — log dates are stored as UTC midnight
  // (the log form submits YYYY-MM-DD), so this matches exactly.
  const daysInMonth = new Date(Date.UTC(cursor.y, cursor.m + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(cursor.y, cursor.m, 1)).getUTCDay();
  const monthKey = `${cursor.y}-${pad(cursor.m + 1)}`;
  const todayKey = localDateKey(new Date());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;
    if (session.user.role !== "athlete") {
      router.push("/dashboard");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/logentries?from=${monthKey}-01&to=${monthKey}-${pad(daysInMonth)}&limit=500`
        );
        const logs: LogEntryDTO[] = res.ok ? await res.json() : [];
        if (!cancelled) setEntries(logs);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, session, router, monthKey, daysInMonth]);

  // Exercise names/body parts are month-independent — load once.
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((exs: ExerciseDTO[]) => setExerciseMap(Object.fromEntries(exs.map((e) => [e._id, e]))))
      .catch(() => {});
  }, [status]);

  const byDate = useMemo(() => {
    const map: Record<string, LogEntryDTO[]> = {};
    for (const e of entries) {
      const key = e.date.slice(0, 10);
      (map[key] ||= []).push(e);
    }
    return map;
  }, [entries]);

  const monthBodyParts = useMemo(() => {
    const names = new Set<string>();
    for (const e of entries) {
      for (const bp of exerciseMap[e.exerciseId]?.bodyPartNames ?? []) names.add(bp);
    }
    return Array.from(names).sort();
  }, [entries, exerciseMap]);

  function bodyPartsFor(dateKey: string): string[] {
    const names = new Set<string>();
    for (const e of byDate[dateKey] ?? []) {
      for (const bp of exerciseMap[e.exerciseId]?.bodyPartNames ?? []) names.add(bp);
    }
    return Array.from(names);
  }

  function shiftMonth(delta: number) {
    setSelectedDate(null);
    setCursor(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  if (status !== "authenticated") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400">Loading...</p></div>;
  }

  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`),
  ];

  const selectedEntries = selectedDate
    ? [...(byDate[selectedDate] ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-safe px-safe">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 text-sm">← Back</Link>
          <h1 className="text-lg font-bold text-white">Workout Calendar</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition"
          >
            ←
          </button>
          <h2 className="text-base font-semibold text-white">
            {MONTH_NAMES[cursor.m]} {cursor.y}
          </h2>
          <button
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 active:scale-95 transition"
          >
            →
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-slate-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid — dots show which body parts were trained that day */}
        {loading ? (
          <p className="text-slate-500 text-sm text-center py-8">Loading...</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((key, i) => {
              if (!key) return <div key={`empty-${i}`} />;
              const dayNum = parseInt(key.slice(8), 10);
              const bps = bodyPartsFor(key);
              const hasWorkout = bps.length > 0;
              const isSelected = selectedDate === key;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    isSelected
                      ? "bg-brand-600/20 ring-2 ring-brand-500"
                      : hasWorkout
                        ? "bg-slate-800 border border-slate-700"
                        : "bg-slate-800/30"
                  } ${isToday && !isSelected ? "ring-1 ring-brand-500/60" : ""}`}
                >
                  <span className={`text-xs font-semibold ${hasWorkout ? "text-white" : "text-slate-500"}`}>
                    {dayNum}
                  </span>
                  {hasWorkout && (
                    <span className="flex items-center gap-0.5 h-1.5">
                      {bps.slice(0, 3).map((bp) => (
                        <span
                          key={bp}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: bodyPartColor(bp) }}
                        />
                      ))}
                      {bps.length > 3 && (
                        <span className="text-[8px] text-slate-400 leading-none">+{bps.length - 3}</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend for this month */}
        {monthBodyParts.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {monthBodyParts.map((bp) => (
              <span key={bp} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bodyPartColor(bp) }} />
                {bp}
              </span>
            ))}
          </div>
        )}

        {/* Selected day details */}
        {selectedDate && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </h2>
              <Link href={`/log/new?date=${selectedDate}`} className="text-xs text-brand-400 font-medium">
                + Log workout
              </Link>
            </div>
            {selectedEntries.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-slate-800/50 border border-slate-800">
                <p className="text-slate-400 text-sm">Rest day — no workouts logged.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedEntries.map((e) => {
                  const ex = exerciseMap[e.exerciseId];
                  return (
                    <div key={e._id} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3.5">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/exercises/${e.exerciseId}`} className="font-semibold text-white text-sm">
                          {ex?.name || "Unknown exercise"}
                        </Link>
                        <span className="text-xs text-slate-500">{e.totalVolume} {e.unit}</span>
                      </div>
                      {(ex?.bodyPartNames?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {ex!.bodyPartNames!.map((bp) => (
                            <span
                              key={bp}
                              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: bodyPartColor(bp) }}
                              />
                              {bp}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {e.sets.map((s, i) => (
                          <span
                            key={i}
                            className={`text-[11px] px-1.5 py-0.5 rounded ${
                              s.type === "drop"
                                ? "bg-amber-400/10 text-amber-300 border border-amber-400/30"
                                : "bg-slate-700/60 text-slate-300"
                            }`}
                          >
                            {s.type === "drop" ? "Drop " : ""}{s.weight}×{s.reps}{s.rpe ? ` @${s.rpe}` : ""}
                          </span>
                        ))}
                      </div>
                      {e.notes && <p className="text-xs text-slate-500 mt-2">{e.notes}</p>}
                      <Link href={`/log/${e._id}/edit`} className="text-xs text-brand-400 mt-2 inline-block">
                        Edit
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && entries.length === 0 && (
          <div className="text-center py-10 rounded-2xl bg-slate-800/50 border border-slate-800">
            <p className="text-slate-400 text-sm">No workouts logged in {MONTH_NAMES[cursor.m]}.</p>
            <Link href="/log/new" className="inline-block mt-3 text-brand-400 text-sm font-medium">
              Log a workout →
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
