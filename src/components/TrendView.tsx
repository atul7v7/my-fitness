"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import type { SetDTO, TrendPoint, TrendResult } from "@/lib/types";
import { cachedFetch } from "@/lib/api-cache";

interface Props {
  fetchUrl: string;
  title: string;
  subtitle?: string;
}

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
  { label: "All", days: 0 },
];

/** One session point enriched with per-set data and deltas vs the prior session. */
interface ChartDatum {
  date: string;
  fullDate: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
  sets: SetDTO[];
  unit: "kg" | "lb";
  maxWeightDelta: number | null;
  volumeDelta: number | null;
  volumeDeltaPct: number | null;
}

export default function TrendView({ fetchUrl, title, subtitle }: Props) {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let url = fetchUrl;
    if (range > 0) {
      const from = new Date();
      from.setDate(from.getDate() - range);
      url += `&from=${from.toISOString().slice(0, 10)}`;
    }
    cachedFetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fetchUrl, range]);

  const chartData: ChartDatum[] = (data?.points || []).map((p, i) => {
    const prev = i > 0 && data ? data.points[i - 1] : null;
    const sameUnit = prev !== null && prev.unit === p.unit;
    return {
      date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: new Date(p.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      maxWeight: p.maxWeight,
      totalVolume: p.totalVolume,
      estimated1RM: Math.round(p.estimated1RM * 10) / 10,
      sets: p.sets,
      unit: p.unit,
      maxWeightDelta: sameUnit && prev!.maxWeight > 0 ? p.maxWeight - prev!.maxWeight : null,
      volumeDelta: prev ? p.totalVolume - prev!.totalVolume : null,
      volumeDeltaPct:
        prev && prev!.totalVolume > 0
          ? ((p.totalVolume - prev!.totalVolume) / prev!.totalVolume) * 100
          : null,
    };
  });

  return (
    <div className="space-y-5">
      {/* Range selector */}
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
      ) : !data || data.points.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-slate-800/50 border border-slate-800">
          <p className="text-slate-400 text-sm">No data in this range.</p>
        </div>
      ) : (
        <>
          {/* Max weight chart */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Max Weight Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip
                  content={
                    <TrendChartTooltip metricKey="maxWeight" metricLabel="Max Weight" metricColor="#a5b4fc" />
                  }
                />
                <Line type="monotone" dataKey="maxWeight" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Total volume chart */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Total Volume Over Time</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                <Tooltip
                  content={
                    <TrendChartTooltip metricKey="totalVolume" metricLabel="Total Volume" metricColor="#6ee7b7" />
                  }
                />
                <Line type="monotone" dataKey="totalVolume" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Then vs Now */}
          {data.thenVsNow.earliest && data.thenVsNow.latest && (
            <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Then vs Now</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div></div>
                <div className="text-xs text-slate-500">Then</div>
                <div className="text-xs text-slate-500">Now</div>

                <div className="text-xs text-slate-400 text-left">Max Wt</div>
                <div className="text-sm text-white">{data.thenVsNow.earliest.maxWeight}</div>
                <div className="text-sm text-white">{data.thenVsNow.latest.maxWeight}</div>

                <div className="text-xs text-slate-400 text-left">Volume</div>
                <div className="text-sm text-white">{data.thenVsNow.earliest.totalVolume}</div>
                <div className="text-sm text-white">{data.thenVsNow.latest.totalVolume}</div>

                <div className="text-xs text-slate-400 text-left">Top Set</div>
                <div className="text-sm text-white">{data.thenVsNow.earliest.topSet.weight}×{data.thenVsNow.earliest.topSet.reps}</div>
                <div className="text-sm text-white">{data.thenVsNow.latest.topSet.weight}×{data.thenVsNow.latest.topSet.reps}</div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700">
                {data.thenVsNow.weightChangePct !== null && (
                  <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500">Weight Δ</p>
                    <p className={`text-sm font-bold ${data.thenVsNow.weightChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {data.thenVsNow.weightChangePct >= 0 ? "+" : ""}{data.thenVsNow.weightChangePct.toFixed(1)}%
                    </p>
                  </div>
                )}
                {data.thenVsNow.volumeChangePct !== null && (
                  <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500">Volume Δ</p>
                    <p className={`text-sm font-bold ${data.thenVsNow.volumeChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {data.thenVsNow.volumeChangePct >= 0 ? "+" : ""}{data.thenVsNow.volumeChangePct.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Set-by-set weight comparison across dates */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Weight Comparison by Date</h3>
            <p className="text-[11px] text-slate-500 mb-3">
              One column per session, earliest to latest. Read across a row to compare the same set —
              arrows show the change versus the previous session&apos;s set.
            </p>
            <SetComparisonTable points={data.points} />
          </div>

          {/* PRs */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Personal Records</h3>
            <div className="space-y-2">
              {data.prs.heaviestSet && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">🏆 Heaviest Set</span>
                  <span className="text-sm text-white font-medium">
                    {data.prs.heaviestSet.weight} × {data.prs.heaviestSet.reps}
                  </span>
                </div>
              )}
              {data.prs.highestVolumeSession && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">📊 Best Volume</span>
                  <span className="text-sm text-white font-medium">
                    {data.prs.highestVolumeSession.volume}
                  </span>
                </div>
              )}
              {data.prs.bestEstimated1RM && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">💪 Est. 1RM</span>
                  <span className="text-sm text-white font-medium">
                    {data.prs.bestEstimated1RM.value.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const SUMMARY_CARDS: {
  label: string;
  key: "maxWeight" | "totalVolume" | "estimated1RM";
  color: string;
}[] = [
  { label: "Top Weight", key: "maxWeight", color: "text-indigo-300" },
  { label: "Top Volume", key: "totalVolume", color: "text-emerald-300" },
  { label: "Best 1RM", key: "estimated1RM", color: "text-amber-300" },
];

function sparklineData(trend: TrendResult) {
  return trend.points.map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    maxWeight: p.maxWeight,
    totalVolume: p.totalVolume,
    estimated1RM: Math.round(p.estimated1RM * 10) / 10,
  }));
}

function StatsCards({ trend }: { trend: TrendResult }) {
  const best = trend.points.reduce(
    (acc, p) => {
      acc.maxWeight = Math.max(acc.maxWeight, p.maxWeight);
      acc.totalVolume = Math.max(acc.totalVolume, p.totalVolume);
      acc.estimated1RM = Math.max(acc.estimated1RM, p.estimated1RM);
      return acc;
    },
    { maxWeight: 0, totalVolume: 0, estimated1RM: 0 }
  );
  return (
    <div className="grid grid-cols-3 gap-2">
      {SUMMARY_CARDS.map((c) => (
        <div key={c.label} className="rounded-xl bg-slate-800/60 border border-slate-800 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">{c.label}</p>
          <p className={`text-base font-bold ${c.color}`}>{Math.round(best[c.key] * 10) / 10}</p>
        </div>
      ))}
    </div>
  );
}

function TrendSparkline({ data, color }: { data: ReturnType<typeof sparklineData>; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={90}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "#64748b", fontSize: 9 }} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
        <Line type="monotone" dataKey="maxWeight" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Inline change badge for a metric versus the previous session. */
function MetricDeltaBadge({
  delta,
  unit,
  pct,
}: {
  delta: number | null;
  unit: "kg" | "lb";
  pct?: number | null;
}) {
  if (delta === null) return null;
  if (Math.abs(delta) < 0.001) {
    return <span className="text-[10px] text-slate-500">Same as previous session</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-[11px] font-semibold ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "▲ +" : "▼ "}
      {formatWeight(Math.abs(delta))}
      {unit}
      {pct !== null && pct !== undefined ? ` (${up ? "+" : ""}${Math.round(Math.abs(pct))}%)` : ""}{" "}
      vs previous
    </span>
  );
}

/**
 * Rich tooltip for the two main trend charts. Shows the full date, the charted
 * metric with unit, the change versus the previous session, and every set
 * lifted that day so the user can see what actually drove the number.
 */
function TrendChartTooltip({
  active,
  payload,
  metricKey,
  metricLabel,
  metricColor,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
  metricKey: "maxWeight" | "totalVolume";
  metricLabel: string;
  metricColor: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  const sets = p.sets || [];

  return (
    <div className="rounded-xl bg-slate-800 border border-slate-600/70 shadow-2xl px-3 py-2.5 text-left min-w-[200px]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
        {p.fullDate}
      </p>

      <div className="flex items-baseline justify-between gap-5">
        <span className="text-[11px] text-slate-400">{metricLabel}</span>
        <span className="text-base font-bold" style={{ color: metricColor }}>
          {formatWeight(p[metricKey])}
          <span className="text-[10px] font-medium text-slate-400"> {p.unit}</span>
        </span>
      </div>

      {metricKey === "maxWeight" && (
        <p className="text-[10px] text-slate-500 mt-0.5">
          Est. 1RM {formatWeight(p.estimated1RM)}
          {p.unit}
        </p>
      )}

      <div className="mt-1.5">
        {metricKey === "maxWeight" ? (
          <MetricDeltaBadge delta={p.maxWeightDelta} unit={p.unit} />
        ) : (
          <MetricDeltaBadge delta={p.volumeDelta} unit={p.unit} pct={p.volumeDeltaPct} />
        )}
      </div>

      {sets.length > 0 && (
        <>
          <div className="my-2 border-t border-slate-700" />
          <p className="text-[9px] uppercase tracking-wide text-slate-500 mb-1">
            Sets performed · {sets.length}
          </p>
          <div className="space-y-0.5">
            {sets.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-slate-500 w-3">{i + 1}.</span>
                <span className="text-white font-medium">
                  {formatWeight(s.weight)}×{s.reps}
                </span>
                <span className="text-[9px] text-slate-500 min-w-[70px] text-right">
                  {metricKey === "totalVolume"
                    ? `= ${Math.round(s.weight * s.reps)}${p.unit}`
                    : s.rpe !== null
                      ? `RPE ${s.rpe}`
                      : ""}
                </span>
              </div>
            ))}
          </div>
          {metricKey === "totalVolume" && (
            <p className="text-[9px] text-slate-500 mt-1 text-right">
              Each set shows its own volume contribution
            </p>
          )}
        </>
      )}
    </div>
  );
}

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : String(Math.round(w * 10) / 10);
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const mdy = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.getFullYear() === new Date().getFullYear()
    ? mdy
    : `${mdy} '${String(d.getFullYear()).slice(2)}`;
}

/** Change marker for one set versus the same set number in the previous session. */
function SetChangeCell({
  prev,
  prevUnit,
  curr,
  unit,
}: {
  prev: SetDTO | undefined;
  prevUnit: "kg" | "lb" | undefined;
  curr: SetDTO;
  unit: "kg" | "lb";
}) {
  if (!prev || prevUnit !== unit) return <span className="text-slate-600">—</span>;
  const wDiff = curr.weight - prev.weight;
  const rDiff = curr.reps - prev.reps;
  if (wDiff > 0.001) return <span className="text-green-400">▲ +{formatWeight(wDiff)}{unit}</span>;
  if (wDiff < -0.001) return <span className="text-red-400">▼ {formatWeight(-wDiff)}{unit}</span>;
  if (rDiff > 0) return <span className="text-green-400">▲ +{rDiff} rep{rDiff > 1 ? "s" : ""}</span>;
  if (rDiff < 0) return <span className="text-red-400">▼ {-rDiff} rep{-rDiff > 1 ? "s" : ""}</span>;
  return <span className="text-slate-600">—</span>;
}

/** Session columns × set-number rows: every set's weight × reps per logged date. */
function SetComparisonTable({ points }: { points: TrendPoint[] }) {
  const maxSets = points.reduce((m, p) => Math.max(m, p.sets.length), 0);
  if (maxSets === 0) return null;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-800 text-left font-semibold text-slate-300 px-2 py-1.5 border-b border-slate-700 whitespace-nowrap">
              Set
            </th>
            {points.map((p, j) => (
              <th
                key={`${j}-${p.date}`}
                className="px-2 py-1.5 border-b border-slate-700 text-right font-semibold text-slate-300 whitespace-nowrap"
              >
                <div>{formatDateLabel(p.date)}</div>
                <div className="text-[9px] font-normal text-slate-500">{p.unit}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxSets }, (_, i) => (
            <tr key={i}>
              <td className="sticky left-0 z-10 bg-slate-800 px-2 py-1.5 font-medium text-slate-400 whitespace-nowrap">
                Set {i + 1}
              </td>
              {points.map((p, j) => {
                const curr = p.sets[i];
                const prev = j > 0 ? points[j - 1].sets[i] : undefined;
                const prevUnit = j > 0 ? points[j - 1].unit : undefined;
                return (
                  <td
                    key={`${j}-${p.date}`}
                    className="px-2 py-1.5 text-right whitespace-nowrap border-b border-slate-800"
                  >
                    {curr ? (
                      <>
                        <div className="text-white font-medium">
                          {formatWeight(curr.weight)}×{curr.reps}
                        </div>
                        <div className="text-[9px] leading-tight">
                          <SetChangeCell prev={prev} prevUnit={prevUnit} curr={curr} unit={p.unit} />
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PerExercisePanelProps {
  name: string;
  linkHref: string;
  trend: TrendResult;
  exerciseColor: string;
}

/**
 * Compact trend analysis for one exercise, used in the body-part breakdown
 * list. Each exercise gets its own summary cards, its own sparkline and its
 * own then-vs-now + PR stats, so the analysis is always for that exercise
 * only and never blended with other movements of the same body part.
 */
export function PerExerciseTrendPanel({ name, linkHref, trend, exerciseColor }: PerExercisePanelProps) {
  const tvn = trend.thenVsNow;
  const hasThenVsNow = tvn.earliest !== null && tvn.latest !== null;
  return (
    <div className="rounded-2xl bg-slate-800/60 border border-slate-800 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white truncate">{name}</h3>
        <Link href={linkHref} className="text-xs text-brand-400 font-medium whitespace-nowrap">
          Full analysis →
        </Link>
      </div>

      <StatsCards trend={trend} />

      {trend.points.length >= 2 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Max Weight Over Time</p>
          <TrendSparkline data={sparklineData(trend)} color={exerciseColor} />
        </div>
      )}

      {hasThenVsNow && (
        <div className="pt-2 border-t border-slate-700/70">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-slate-900/60 p-2">
              <p className="text-[10px] text-slate-500 mb-0.5">Then</p>
              <p className="text-xs text-white">
                {tvn.earliest!.topSet.weight}×{tvn.earliest!.topSet.reps}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2">
              <p className="text-[10px] text-slate-500 mb-0.5">Now</p>
              <p className="text-xs text-white">
                {tvn.latest!.topSet.weight}×{tvn.latest!.topSet.reps}
              </p>
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            {tvn.weightChangePct !== null && (
              <span className="flex-1 text-center text-[11px] rounded-lg bg-slate-900/40 py-1.5 text-slate-300">
                Weight{" "}
                <span className={`font-bold ${tvn.weightChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {tvn.weightChangePct >= 0 ? "+" : ""}
                  {tvn.weightChangePct.toFixed(0)}%
                </span>
              </span>
            )}
            {tvn.volumeChangePct !== null && (
              <span className="flex-1 text-center text-[11px] rounded-lg bg-slate-900/40 py-1.5 text-slate-300">
                Volume{" "}
                <span className={`font-bold ${tvn.volumeChangePct >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {tvn.volumeChangePct >= 0 ? "+" : ""}
                  {tvn.volumeChangePct.toFixed(0)}%
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {trend.prs.heaviestSet && (
        <div className="pt-2 border-t border-slate-700/70 flex items-center justify-between">
          <span className="text-xs text-slate-400">🏆 Heaviest Set</span>
          <span className="text-xs text-white font-medium">
            {trend.prs.heaviestSet.weight} × {trend.prs.heaviestSet.reps}
          </span>
        </div>
      )}
    </div>
  );
}
