import type { LogEntryDTO, SetDTO, SuggestionDTO, TrendPoint, TrendResult } from "./types";

/** Epley formula: estimated 1-rep max. */
export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0) return weight;
  return weight * (1 + reps / 30);
}

/** Sum of weight * reps across all sets. */
export function computeTotalVolume(sets: SetDTO[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/** The heaviest set by weight (ties broken by reps). */
export function topSet(sets: SetDTO[]): SetDTO | null {
  if (!sets.length) return null;
  return sets.reduce((best, s) => {
    if (s.weight > best.weight) return s;
    if (s.weight === best.weight && s.reps > best.reps) return s;
    return best;
  });
}

/**
 * Rule-based progressive-overload suggestion from the last 1-3 sessions.
 * Strategy:
 *  - If the last session's top set was completed at RPE <= 8 (or null), bump weight
 *    by a small increment (2.5 kg / 5 lb).
 *  - Otherwise, keep weight and suggest +1 rep.
 *  - Cap increments to sensible amounts.
 */
export function buildSuggestion(recent: LogEntryDTO[]): SuggestionDTO | null {
  if (!recent.length) return null;
  const last = recent[0];
  const unit = last.unit;

  const weightStep = unit === "kg" ? 2.5 : 5;
  const suggestedSets: SetDTO[] = last.sets.map((s) => ({ ...s }));

  // Decide whether to add weight or reps based on the top set's RPE.
  const top = topSet(last.sets);
  const rpe = top?.rpe ?? null;
  const addWeight = rpe === null || rpe <= 8;

  if (addWeight && top) {
    suggestedSets.forEach((s) => {
      if (s.weight === top.weight) {
        s.weight = roundWeight(s.weight + weightStep);
      }
    });
    return {
      message: `Last session you hit ${last.sets.length}×${top.reps} @ ${top.weight}${unit}. Try ${top.reps} reps @ ${roundWeight(top.weight + weightStep)}${unit}.`,
      suggestedSets,
      unit,
    };
  }

  // Add a rep to the top set instead.
  if (top) {
    suggestedSets.forEach((s) => {
      if (s.weight === top.weight && s.reps === top.reps) {
        s.reps = s.reps + 1;
      }
    });
    return {
      message: `Last session you did ${last.sets.length}×${top.reps} @ ${top.weight}${unit}. Try ${top.reps + 1} reps @ ${top.weight}${unit}.`,
      suggestedSets,
      unit,
    };
  }

  return null;
}

function roundWeight(w: number): number {
  // Round to nearest 0.5.
  return Math.round(w * 2) / 2;
}

/** Build trend points + then-vs-now + PRs from a list of log entries (any order). */
export function buildTrend(entries: LogEntryDTO[]): TrendResult {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const points: TrendPoint[] = sorted.map((e) => {
    const top = topSet(e.sets);
    return {
      date: e.date,
      maxWeight: top?.weight ?? 0,
      totalVolume: e.totalVolume,
      estimated1RM: top ? estimated1RM(top.weight, top.reps) : 0,
    };
  });

  const earliest = sorted.length
    ? {
        date: sorted[0].date,
        maxWeight: topSet(sorted[0].sets)?.weight ?? 0,
        totalVolume: sorted[0].totalVolume,
        topSet: topSet(sorted[0].sets)!,
      }
    : null;
  const latest = sorted.length
    ? {
        date: sorted[sorted.length - 1].date,
        maxWeight: topSet(sorted[sorted.length - 1].sets)?.weight ?? 0,
        totalVolume: sorted[sorted.length - 1].totalVolume,
        topSet: topSet(sorted[sorted.length - 1].sets)!,
      }
    : null;

  const weightChangePct =
    earliest && latest && earliest.maxWeight > 0
      ? ((latest.maxWeight - earliest.maxWeight) / earliest.maxWeight) * 100
      : null;
  const volumeChangePct =
    earliest && latest && earliest.totalVolume > 0
      ? ((latest.totalVolume - earliest.totalVolume) / earliest.totalVolume) * 100
      : null;

  // PRs across all entries.
  let heaviestSet: { weight: number; reps: number; date: string } | null = null;
  let highestVolumeSession: { volume: number; date: string } | null = null;
  let bestEstimated1RM: { value: number; date: string } | null = null;

  for (const e of sorted) {
    const top = topSet(e.sets);
    if (top) {
      if (!heaviestSet || top.weight > heaviestSet.weight) {
        heaviestSet = { weight: top.weight, reps: top.reps, date: e.date };
      }
      const e1rm = estimated1RM(top.weight, top.reps);
      if (!bestEstimated1RM || e1rm > bestEstimated1RM.value) {
        bestEstimated1RM = { value: e1rm, date: e.date };
      }
    }
    if (!highestVolumeSession || e.totalVolume > highestVolumeSession.volume) {
      highestVolumeSession = { volume: e.totalVolume, date: e.date };
    }
  }

  return {
    points,
    thenVsNow: { earliest, latest, weightChangePct, volumeChangePct },
    prs: { heaviestSet, highestVolumeSession, bestEstimated1RM },
  };
}
