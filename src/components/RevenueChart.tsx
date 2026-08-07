"use client";

import { useState } from "react";
import { fmtDateFull, idr, idrShort } from "@/lib/format";
import type { DailyPoint } from "@/lib/queries";

// Two series, so a legend is always present and both are direct-labelled in the
// tooltip. Colours are categorical slots 1 and 2 from the validated palette
// (blue #2a78d6 / orange #eb6834 — adjacent-pair CVD ΔE 24.7, normal 33.6).

const CHART_H = 200;

export default function RevenueChart({ daily }: { daily: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const max = Math.max(1, ...daily.map((d) => Math.max(d.revenue, d.expenses)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const point = hover !== null ? daily[hover] : null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">Revenue and expenses by day</p>
          <p className="text-[13px] text-ink-2">Hover a day for the exact figures</p>
        </div>
        <div className="flex items-center gap-4">
          <LegendKey color="var(--color-series-1)" label="Revenue" />
          <LegendKey color="var(--color-series-2)" label="Expenses" />
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="text-[13px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {showTable ? "Hide table" : "Table"}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* y axis */}
        <div
          className="relative w-14 shrink-0 text-right text-[10px] tabular text-ink-3"
          style={{ height: CHART_H }}
        >
          {ticks.map((t, i) => (
            <span
              key={t + "-" + i}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {idrShort(t)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: CHART_H }} onMouseLeave={() => setHover(null)}>
            {/* recessive gridlines */}
            {ticks.map((t, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-hairline"
                style={{ bottom: `${(i / (ticks.length - 1)) * 100}%` }}
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-[2px]">
              {daily.map((d, i) => (
                <div
                  key={d.day}
                  className="group relative flex h-full flex-1 items-end justify-center gap-[2px]"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={-1}
                >
                  {hover === i && <div className="absolute inset-0 -z-10 bg-soft" />}
                  <span
                    className="w-1/2 rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${(d.revenue / max) * 100}%`,
                      minHeight: d.revenue > 0 ? 2 : 0,
                      background: "var(--color-series-1)",
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                  <span
                    className="w-1/2 rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${(d.expenses / max) * 100}%`,
                      minHeight: d.expenses > 0 ? 2 : 0,
                      background: "var(--color-series-2)",
                      opacity: hover === null || hover === i ? 1 : 0.45,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* x axis */}
          <div className="mt-1.5 flex gap-[2px] text-[10px] tabular text-ink-3">
            {daily.map((d, i) => (
              <span key={d.day} className="flex-1 text-center">
                {i % 5 === 0 ? new Date(`${d.day}T00:00:00`).getDate() : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 min-h-11 rounded-lg bg-soft px-3 py-2 text-[13px]">
        {point ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <span className="font-semibold">{fmtDateFull(`${point.day}T00:00:00`)}</span>
            <span className="inline-flex items-center gap-1.5">
              <Dot color="var(--color-series-1)" /> Revenue{" "}
              <span className="font-semibold tabular">{idr(point.revenue)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Dot color="var(--color-series-2)" /> Expenses{" "}
              <span className="font-semibold tabular">{idr(point.expenses)}</span>
            </span>
            <span className="text-ink-2">
              Net <span className="font-semibold tabular">{idr(point.revenue - point.expenses)}</span>
            </span>
          </div>
        ) : (
          <span className="text-ink-2">Hover any day to read its revenue, expenses and net.</span>
        )}
      </div>

      {showTable && (
        <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-hairline">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-hairline text-left text-ink-2">
                <th className="px-3 py-2 font-medium">Day</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                <th className="px-3 py-2 text-right font-medium">Expenses</th>
                <th className="px-3 py-2 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {daily.map((d) => (
                <tr key={d.day}>
                  <td className="px-3 py-1.5">{fmtDateFull(`${d.day}T00:00:00`)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{idr(d.revenue)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{idr(d.expenses)}</td>
                  <td className="px-3 py-1.5 text-right tabular">{idr(d.revenue - d.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-2">
      <Dot color={color} />
      {label}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />;
}
