import Link from "next/link";
import { fmtTime, hoursLabel, idrShort, startOfDay } from "@/lib/format";
import type { BookingWithUnit, UnitWithPhotos } from "@/lib/types";

const BLOCK_STYLES: Record<string, string> = {
  inquiry: "bg-[var(--color-warn-soft)] text-[var(--color-warn)] border-[#f0d9ac] border-dashed",
  confirmed: "bg-[var(--color-info-soft)] text-[var(--color-info)] border-[#bcd9f6]",
  checked_in: "bg-[var(--color-good-soft)] text-[var(--color-good)] border-[#b6ddb8]",
  completed: "bg-soft text-ink-2 border-hairline",
};

/**
 * One day, units down the left, 24 hours across. Blocks are positioned as a
 * percentage of the day so the grid stays correct at any width.
 */
export default function ScheduleTimeline({
  day,
  units,
  bookings,
  compact = false,
}: {
  day: Date;
  units: UnitWithPhotos[];
  bookings: BookingWithUnit[];
  compact?: boolean;
}) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 86_400_000;
  const now = Date.now();
  const nowPct = now > dayStart && now < dayEnd ? ((now - dayStart) / 86_400_000) * 100 : null;

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          {/* hour ruler */}
          <div className="flex border-b border-hairline bg-soft/60">
            <div className="w-44 shrink-0 border-r border-hairline px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-2">
              Unit
            </div>
            <div className="relative flex-1">
              <div className="flex">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="flex-1 border-r border-hairline py-2 text-center text-[10px] tabular text-ink-2 last:border-r-0"
                  >
                    {h % (compact ? 3 : 2) === 0 ? String(h).padStart(2, "0") : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {units.map((unit) => {
            const rows = bookings.filter((b) => b.unit_id === unit.id);
            return (
              <div key={unit.id} className="flex border-b border-hairline last:border-b-0">
                <div className="w-44 shrink-0 border-r border-hairline px-3 py-3">
                  <Link href={`/units/${unit.id}`} className="block truncate text-[13px] font-semibold hover:underline">
                    {unit.name}
                  </Link>
                  <p className="truncate text-[11px] text-ink-2">
                    {idrShort(unit.base_rate)}/h · min {unit.min_hours}h
                  </p>
                </div>

                <div className="relative flex-1" style={{ height: compact ? 46 : 58 }}>
                  {/* hour gridlines */}
                  <div className="absolute inset-0 flex">
                    {hours.map((h) => (
                      <div key={h} className="flex-1 border-r border-hairline last:border-r-0" />
                    ))}
                  </div>

                  {rows.map((b) => {
                    const s = Math.max(new Date(b.starts_at).getTime(), dayStart);
                    const e = Math.min(new Date(b.ends_at).getTime(), dayEnd);
                    const left = ((s - dayStart) / 86_400_000) * 100;
                    const width = ((e - s) / 86_400_000) * 100;
                    return (
                      <Link
                        key={b.id}
                        href={`/bookings/${b.id}`}
                        title={`${b.guest_name} · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)} · ${hoursLabel(b.hours)}`}
                        className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight transition-shadow hover:shadow-[var(--shadow-card)] ${
                          BLOCK_STYLES[b.status] ?? BLOCK_STYLES.completed
                        }`}
                        style={{ left: `${left}%`, width: `calc(${width}% - 3px)` }}
                      >
                        <span className="block truncate">{b.guest_name}</span>
                        {!compact && (
                          <span className="block truncate font-medium opacity-80">
                            {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {nowPct !== null && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rausch"
                      style={{ left: `${nowPct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {!units.length && (
            <p className="px-4 py-10 text-center text-sm text-ink-2">No units yet.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-hairline px-4 py-2.5 text-[11px] text-ink-2">
        <Legend className="bg-[var(--color-info-soft)] border-[#bcd9f6]" label="Confirmed" />
        <Legend className="bg-[var(--color-good-soft)] border-[#b6ddb8]" label="Checked in" />
        <Legend className="bg-[var(--color-warn-soft)] border-[#f0d9ac] border-dashed" label="Inquiry" />
        <Legend className="bg-soft border-hairline" label="Completed" />
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-px bg-rausch" /> Now
        </span>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-5 rounded border ${className}`} />
      {label}
    </span>
  );
}
