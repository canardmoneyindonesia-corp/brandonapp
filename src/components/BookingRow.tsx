import Link from "next/link";
import Icon from "./Icon";
import { StatusBadge } from "./ui";
import { fmtDateFull, fmtTime, hoursLabel, idr, isSameDay } from "@/lib/format";
import type { BookingWithUnit } from "@/lib/types";

export default function BookingRow({
  booking: b,
  showDate = true,
}: {
  booking: BookingWithUnit;
  showDate?: boolean;
}) {
  const start = new Date(b.starts_at);
  const today = isSameDay(start, new Date());
  const due = b.total_amount - b.paid_amount;

  return (
    <Link
      href={`/bookings/${b.id}`}
      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-soft sm:gap-4 sm:px-4"
    >
      <div className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-soft sm:block">
        {b.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="grid h-full w-full place-items-center text-ink-3">
            <Icon name="units" size={18} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold">{b.guest_name}</p>
          {due > 0 && b.status !== "cancelled" && b.status !== "no_show" && (
            <span className="badge bg-[var(--color-warn-soft)] text-[var(--color-warn)]">Due {idr(due)}</span>
          )}
        </div>
        <p className="truncate text-[13px] text-ink-2">
          {b.unit_name} · {b.guests} guest{b.guests > 1 ? "s" : ""} · {b.code}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-ink-2">
          <span className={today ? "font-semibold text-ink" : ""}>
            {showDate ? (today ? "Today" : fmtDateFull(start)) : ""}
          </span>
          {showDate && " · "}
          {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {hoursLabel(b.hours)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold tabular">{idr(b.total_amount)}</p>
        <div className="mt-1">
          <StatusBadge status={b.status} />
        </div>
      </div>
    </Link>
  );
}
