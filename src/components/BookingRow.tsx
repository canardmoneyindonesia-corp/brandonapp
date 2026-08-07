import Link from "next/link";
import Icon from "./Icon";
import { StatusBadge } from "./ui";
import { fmtDateFull, fmtTime, hoursLabel, idr, isSameDay } from "@/lib/format";
import type { BookingWithUnit } from "@/lib/types";

// No "amount due" anywhere: guests settle on arrival, so a booking is never
// carrying a balance the operator needs to chase.

export default function BookingRow({
  booking: b,
  showDate = true,
}: {
  booking: BookingWithUnit;
  showDate?: boolean;
}) {
  const start = new Date(b.starts_at);
  const today = isSameDay(start, new Date());

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
        <p className="truncate text-[14px] font-semibold sm:text-[15px]">{b.guest_name}</p>
        <p className="truncate text-[12px] text-ink-2 sm:text-[13px]">
          {b.unit_name} · {b.guests} guest{b.guests > 1 ? "s" : ""} · {b.code}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-ink-2 sm:text-[13px]">
          <span className={today ? "font-semibold text-ink" : ""}>
            {showDate ? (today ? "Today" : fmtDateFull(start)) : ""}
          </span>
          {showDate && " · "}
          {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {hoursLabel(b.hours)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap text-[13px] font-semibold tabular sm:text-[15px]">
          {idr(b.total_amount)}
        </p>
        <div className="mt-1">
          <StatusBadge status={b.status} />
        </div>
      </div>
    </Link>
  );
}
