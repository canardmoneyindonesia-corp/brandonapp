import Link from "next/link";
import Icon from "@/components/Icon";
import BookingRow from "@/components/BookingRow";
import { EmptyState, ErrorNote, Page, PageHeader } from "@/components/ui";
import { getBookings, getUnits } from "@/lib/queries";
import { BOOKING_STATUSES } from "@/lib/types";
import { addDays, idr, startOfDay, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

const RANGES: Record<string, { label: string; from?: () => Date; to?: () => Date }> = {
  upcoming: { label: "Upcoming", from: () => new Date() },
  today: { label: "Today", from: () => startOfDay(), to: () => addDays(startOfDay(), 1) },
  week: { label: "Next 7 days", from: () => new Date(), to: () => addDays(startOfDay(), 8) },
  past: { label: "Past", to: () => new Date() },
  all: { label: "All time" },
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; unit?: string; q?: string; range?: string }>;
}) {
  const sp = await searchParams;
  const range = RANGES[sp.range ?? "upcoming"] ? (sp.range ?? "upcoming") : "upcoming";
  const r = RANGES[range];

  let bookings, units;
  try {
    [bookings, units] = await Promise.all([
      getBookings({
        from: r.from?.(),
        to: r.to?.(),
        status: sp.status,
        unitId: sp.unit ? Number(sp.unit) : undefined,
        search: sp.q,
        limit: 300,
      }),
      getUnits(),
    ]);
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Bookings" />
        <ErrorNote title="Cannot load bookings" body={(err as Error).message} />
      </Page>
    );
  }

  const live = bookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
  const revenue = live.reduce((s, b) => s + b.total_amount, 0);
  const hours = live.reduce((s, b) => s + Number(b.hours), 0);

  const q = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { range, status: sp.status, unit: sp.unit, q: sp.q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/bookings?${params.toString()}`;
  };

  return (
    <Page>
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} shown · ${hours}h · ${idr(revenue)} booked`}
        action={
          <Link href="/bookings/new" className="btn-primary">
            <Icon name="plus" size={17} />
            New booking
          </Link>
        }
      />

      <form action="/bookings" className="mb-4 flex gap-2">
        <input type="hidden" name="range" value={range} />
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.unit && <input type="hidden" name="unit" value={sp.unit} />}
        <div className="relative flex-1">
          <Icon name="search" size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-2" />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search guest, phone or booking code"
            className="input pl-10"
          />
        </div>
        <button type="submit" className="btn-dark">Search</button>
      </form>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        {Object.entries(RANGES).map(([key, val]) => (
          <Link key={key} href={q({ range: key })} className={`chip ${range === key ? "chip-active" : ""}`}>
            {val.label}
          </Link>
        ))}
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link href={q({ status: undefined })} className={`chip ${!sp.status ? "chip-active" : ""}`}>
          Any status
        </Link>
        {BOOKING_STATUSES.map((s) => (
          <Link key={s} href={q({ status: s })} className={`chip ${sp.status === s ? "chip-active" : ""}`}>
            {titleCase(s)}
          </Link>
        ))}
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        <Link href={q({ unit: undefined })} className={`chip ${!sp.unit ? "chip-active" : ""}`}>
          All units
        </Link>
        {units.map((u) => (
          <Link key={u.id} href={q({ unit: String(u.id) })} className={`chip ${sp.unit === String(u.id) ? "chip-active" : ""}`}>
            {u.name}
          </Link>
        ))}
      </div>

      {bookings.length ? (
        <div className="card divide-hair overflow-hidden">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="bookings"
          title="No bookings match"
          body="Try a wider date range or clear the filters."
          action={
            <Link href="/bookings?range=all" className="btn-ghost">
              Show all time
            </Link>
          }
        />
      )}
    </Page>
  );
}
