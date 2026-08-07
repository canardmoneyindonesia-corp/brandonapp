import Link from "next/link";
import Icon from "@/components/Icon";
import BookingRow from "@/components/BookingRow";
import ScheduleTimeline from "@/components/ScheduleTimeline";
import InstallCard from "@/components/InstallCard";
import { Avatar, EmptyState, ErrorNote, Page, PageHeader, SectionTitle, StatTile } from "@/components/ui";
import { getBookings, getContacts, getDashboard, getScheduleDay, getUnits } from "@/lib/queries";
import { addDays, fmtChatStamp, fmtDateLong, idr, idrShort } from "@/lib/format";

export const dynamic = "force-dynamic";

// Rentals are sold in the 06:00–22:00 window; occupancy is measured against it.
const BOOKABLE_HOURS = 16;

export default async function DashboardPage() {
  const today = new Date();

  let data;
  try {
    const [kpis, units, todaySchedule, upcoming, contacts] = await Promise.all([
      getDashboard(),
      getUnits(),
      getScheduleDay(today),
      getBookings({ from: new Date(), to: addDays(today, 8), limit: 8 }),
      getContacts(),
    ]);
    data = { kpis, units, todaySchedule, upcoming, contacts };
  } catch (err) {
    return (
      <Page>
        <PageHeader title="Today" />
        <ErrorNote
          title="Cannot reach the database"
          body={`${(err as Error).message}\n\nCheck DATABASE_URL in .env.local, then run:\n  npm run db:reset`}
        />
      </Page>
    );
  }

  const { kpis, units, todaySchedule, upcoming, contacts } = data;
  const capacityHours = Math.max(1, kpis.active_units * BOOKABLE_HOURS);
  const occupancy = Math.min(100, (kpis.hours_today / capacityHours) * 100);
  const netMonth = kpis.revenue_month - kpis.expenses_month;
  const unreadThreads = contacts.filter((c) => c.unread > 0);

  return (
    <Page>
      <PageHeader
        title="Today"
        subtitle={fmtDateLong(today)}
        action={
          <div className="hidden gap-2 sm:flex">
            <Link href="/schedule" className="btn-ghost">
              <Icon name="calendar" size={17} />
              Full schedule
            </Link>
            <Link href="/bookings/new" className="btn-primary">
              <Icon name="plus" size={17} />
              New booking
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Revenue today"
          value={idr(kpis.revenue_today)}
          sub={`${kpis.bookings_today} booking${kpis.bookings_today === 1 ? "" : "s"}`}
          icon="wallet"
          href="/income"
        />
        <StatTile
          label="Occupancy today"
          value={`${occupancy.toFixed(0)}%`}
          sub={`${kpis.hours_today}h of ${capacityHours}h bookable`}
          icon="clock"
          href="/schedule"
        />
        <StatTile
          label="Unpaid balance"
          value={idr(kpis.outstanding)}
          sub="across all open bookings"
          icon="bookings"
          href="/bookings"
        />
        <StatTile
          label="Unread messages"
          value={String(kpis.unread_messages)}
          sub={`${unreadThreads.length} conversation${unreadThreads.length === 1 ? "" : "s"}`}
          icon="whatsapp"
          href="/inbox"
        />
      </div>

      {/* month strip */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Revenue MTD" value={idr(kpis.revenue_month)} />
        <MiniStat label="Expenses MTD" value={idr(kpis.expenses_month)} />
        <MiniStat
          label="Net MTD"
          value={idr(netMonth)}
          tone={netMonth >= 0 ? "good" : "bad"}
        />
        <MiniStat label="Hours sold MTD" value={`${kpis.hours_month}h`} />
      </div>

      <section className="mt-9">
        <SectionTitle
          action={
            <Link href="/schedule" className="text-sm font-semibold underline underline-offset-4">
              Open schedule
            </Link>
          }
        >
          Today&apos;s schedule
        </SectionTitle>
        <ScheduleTimeline day={today} units={units} bookings={todaySchedule} compact />
      </section>

      <div className="mt-9 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <SectionTitle
            action={
              <Link href="/bookings" className="text-sm font-semibold underline underline-offset-4">
                All bookings
              </Link>
            }
          >
            Next up
          </SectionTitle>
          {upcoming.length ? (
            <div className="card divide-hair overflow-hidden">
              {[...upcoming].reverse().map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="calendar"
              title="Nothing booked yet"
              body="When a guest confirms a slot it shows up here with the time, unit and balance due."
              action={
                <Link href="/bookings/new" className="btn-primary">
                  <Icon name="plus" size={17} />
                  Log a booking
                </Link>
              }
            />
          )}
        </section>

        <section className="lg:col-span-2">
          <SectionTitle
            action={
              <Link href="/inbox" className="text-sm font-semibold underline underline-offset-4">
                Inbox
              </Link>
            }
          >
            Messages
          </SectionTitle>
          <div className="card divide-hair overflow-hidden">
            {contacts.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/inbox?c=${c.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-soft"
              >
                <Avatar name={c.name} hue={c.avatar_hue} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[14px] font-semibold">{c.name}</p>
                    <span className="ml-auto shrink-0 text-[11px] text-ink-2">
                      {fmtChatStamp(c.last_message_at)}
                    </span>
                  </div>
                  <p className={`truncate text-[13px] ${c.unread ? "font-medium text-ink" : "text-ink-2"}`}>
                    {c.preview ?? "—"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-rausch px-1.5 text-[11px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            ))}
            {!contacts.length && <p className="px-4 py-10 text-center text-sm text-ink-2">No conversations yet.</p>}
          </div>

          <div className="mt-6">
            <InstallCard />
          </div>
        </section>
      </div>

      {/* units quick glance */}
      <section className="mt-9">
        <SectionTitle
          action={
            <Link href="/units" className="text-sm font-semibold underline underline-offset-4">
              Manage units
            </Link>
          }
        >
          Units
        </SectionTitle>
        <div className="card divide-hair overflow-hidden">
          {units.map((u) => {
            const busy = todaySchedule.filter((b) => b.unit_id === u.id);
            const hours = busy.reduce((s, b) => s + Number(b.hours), 0);
            return (
              <Link key={u.id} href={`/units/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-soft">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-soft">
                  {u.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photos[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{u.name}</p>
                  <p className="truncate text-[12px] text-ink-2">
                    {idrShort(u.base_rate)}/hour · {u.type}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold tabular">{hours}h</p>
                  <p className="text-[11px] text-ink-2">booked today</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </Page>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-[var(--color-good)]" : tone === "bad" ? "text-[var(--color-bad)]" : "text-ink";
  return (
    <div className="rounded-xl bg-soft px-4 py-3">
      <p className="text-[12px] font-medium text-ink-2">{label}</p>
      <p className={`mt-0.5 text-[17px] font-semibold tabular ${color}`}>{value}</p>
    </div>
  );
}
