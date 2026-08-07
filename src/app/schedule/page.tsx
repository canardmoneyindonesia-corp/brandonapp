import Link from "next/link";
import Icon from "@/components/Icon";
import BookingRow from "@/components/BookingRow";
import ScheduleTimeline from "@/components/ScheduleTimeline";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/ui";
import { getScheduleDay, getScheduleRange, getUnits } from "@/lib/queries";
import {
  addDays,
  fmtDateLong,
  hoursLabel,
  idr,
  isoDate,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const BOOKABLE_HOURS = 16;

function parseDate(v: string | undefined): Date {
  if (!v) return startOfDay();
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? startOfDay() : d;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; unit?: string }>;
}) {
  const sp = await searchParams;
  const day = parseDate(sp.date);
  const unitFilter = sp.unit ? Number(sp.unit) : null;
  const weekStart = startOfWeek(day);

  let units, bookings, week;
  try {
    [units, bookings, week] = await Promise.all([
      getUnits(),
      getScheduleDay(day),
      getScheduleRange(weekStart, addDays(weekStart, 7)),
    ]);
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Schedule" />
        <ErrorNote title="Cannot load the schedule" body={(err as Error).message} />
      </Page>
    );
  }

  const shownUnits = unitFilter ? units.filter((u) => u.id === unitFilter) : units;
  const dayBookings = unitFilter ? bookings.filter((b) => b.unit_id === unitFilter) : bookings;

  const hoursBooked = dayBookings.reduce((s, b) => s + Number(b.hours), 0);
  const revenue = dayBookings.reduce((s, b) => s + b.total_amount, 0);
  const capacity = Math.max(1, shownUnits.filter((u) => u.status === "active").length * BOOKABLE_HOURS);

  const href = (d: Date) => `/schedule?date=${isoDate(d)}${unitFilter ? `&unit=${unitFilter}` : ""}`;
  const today = startOfDay();

  return (
    <Page>
      <PageHeader
        title="Schedule"
        subtitle={`${fmtDateLong(day)} · ${hoursLabel(hoursBooked)} booked of ${capacity}h · ${idr(revenue)}`}
        action={
          <div className="flex gap-2">
            <Link href={href(today)} className="btn-ghost btn-sm">
              Today
            </Link>
            <Link href={`/bookings/new?date=${isoDate(day)}`} className="btn-primary btn-sm">
              <Icon name="plus" size={16} />
              New booking
            </Link>
          </div>
        }
      />

      {/* week strip */}
      <div className="mb-5 flex items-center gap-2">
        <Link href={href(addDays(day, -7))} className="icon-btn" aria-label="Previous week">
          <Icon name="chevronLeft" size={16} />
        </Link>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
            const selected = isSameDay(d, day);
            const isToday = isSameDay(d, today);
            const count = week.filter(
              (b) => isSameDay(new Date(b.starts_at), d) && (!unitFilter || b.unit_id === unitFilter)
            ).length;
            return (
              <Link
                key={d.toISOString()}
                href={href(d)}
                className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 transition-colors ${
                  selected ? "border-ink bg-ink text-white" : "border-hairline bg-white hover:border-ink"
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wide ${selected ? "text-white/70" : "text-ink-2"}`}>
                  {d.toLocaleDateString("en-GB", { weekday: "short" })}
                </span>
                <span className={`text-[16px] font-semibold tabular ${isToday && !selected ? "text-rausch" : ""}`}>
                  {d.getDate()}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    count === 0 ? "bg-transparent" : selected ? "bg-white" : "bg-rausch"
                  }`}
                />
              </Link>
            );
          })}
        </div>
        <Link href={href(addDays(day, 7))} className="icon-btn" aria-label="Next week">
          <Icon name="chevronRight" size={16} />
        </Link>
      </div>

      {/* unit filter */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={`/schedule?date=${isoDate(day)}`} className={`chip ${!unitFilter ? "chip-active" : ""}`}>
          All units
        </Link>
        {units.map((u) => (
          <Link
            key={u.id}
            href={`/schedule?date=${isoDate(day)}&unit=${u.id}`}
            className={`chip ${unitFilter === u.id ? "chip-active" : ""}`}
          >
            {u.name}
          </Link>
        ))}
      </div>

      <ScheduleTimeline day={day} units={shownUnits} bookings={dayBookings} />

      <section className="mt-8">
        <h2 className="section-title mb-3">
          {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"} on this day
        </h2>
        {dayBookings.length ? (
          <div className="card divide-hair overflow-hidden">
            {dayBookings.map((b) => (
              <BookingRow key={b.id} booking={b} showDate={false} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="calendar"
            title="A completely open day"
            body="Nothing is booked. Log a booking or share availability with a guest in the inbox."
            action={
              <Link href={`/bookings/new?date=${isoDate(day)}`} className="btn-primary">
                <Icon name="plus" size={17} />
                Log a booking
              </Link>
            }
          />
        )}
      </section>

      {/* week at a glance */}
      <section className="mt-9">
        <h2 className="section-title mb-3">This week</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-2">
                <th className="px-4 py-2.5 font-medium">Unit</th>
                {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => (
                  <th key={d.toISOString()} className="px-2 py-2.5 text-center font-medium">
                    {d.toLocaleDateString("en-GB", { weekday: "short" })} {d.getDate()}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {shownUnits.map((u) => {
                const rows = week.filter((b) => b.unit_id === u.id);
                const total = rows.reduce((s, b) => s + Number(b.hours), 0);
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/units/${u.id}`} className="font-medium hover:underline">
                        {u.name}
                      </Link>
                    </td>
                    {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
                      const h = rows
                        .filter((b) => isSameDay(new Date(b.starts_at), d))
                        .reduce((s, b) => s + Number(b.hours), 0);
                      const load = Math.min(1, h / BOOKABLE_HOURS);
                      return (
                        <td key={d.toISOString()} className="px-2 py-2.5 text-center">
                          <Link
                            href={href(d)}
                            className="inline-grid h-8 w-full min-w-9 place-items-center rounded-md tabular"
                            style={{
                              background: h ? `rgba(255, 56, 92, ${0.1 + load * 0.55})` : "var(--color-soft)",
                              color: load > 0.55 ? "#fff" : "var(--color-ink)",
                            }}
                          >
                            {h ? `${h}h` : "—"}
                          </Link>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right font-semibold tabular">{total}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}
