"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { TrendResult } from "@/lib/types";

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
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [fetchUrl, range]);

  const chartData = (data?.points || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    maxWeight: p.maxWeight,
    totalVolume: p.totalVolume,
    estimated1RM: Math.round(p.estimated1RM * 10) / 10,
  }));

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
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
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
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} />
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
