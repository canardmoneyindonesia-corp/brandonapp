import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import BookingRow from "@/components/BookingRow";
import PhotoManager from "@/components/PhotoManager";
import DangerButton from "@/components/DangerButton";
import { EmptyState, Page, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { getBookings, getPricingRules, getUnit, getUnitStats } from "@/lib/queries";
import { describeRule } from "@/lib/pricing";
import { idr, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

const AMENITY_ICONS: Record<string, string> = {
  "Wi-Fi": "wifi",
  "Air conditioning": "bolt",
  "Smart TV": "units",
  Netflix: "units",
  Kitchenette: "home",
  "Full kitchen": "home",
  "Hot water": "bath",
  "Washing machine": "refresh",
  Workspace: "edit",
  Balcony: "pin",
  "Garden view": "pin",
  "Pool access": "bath",
  "Gym access": "bolt",
  Parking: "pin",
  Elevator: "arrowUp",
  "Security 24h": "check",
};

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const unit = await getUnit(id);
  if (!unit) notFound();

  const [stats, upcoming, rules] = await Promise.all([
    getUnitStats(id),
    getBookings({ unitId: id, from: new Date(), limit: 6 }),
    getPricingRules(id),
  ]);

  const [hero, ...rest] = unit.photos;

  return (
    <Page>
      <PageHeader
        title={unit.name}
        subtitle={[unit.type, unit.building, unit.floor && `Floor ${unit.floor}`].filter(Boolean).join(" · ")}
        back={{ href: "/units", label: "Units" }}
        action={
          <div className="flex gap-2">
            <Link href={`/units/${unit.id}/edit`} className="btn-ghost">
              <Icon name="edit" size={16} />
              Edit
            </Link>
            <Link href={`/bookings/new?unit=${unit.id}`} className="btn-primary">
              <Icon name="plus" size={17} />
              Book
            </Link>
          </div>
        }
      />

      {/* Airbnb-style gallery: one hero, four supporting shots. */}
      {unit.photos.length > 0 && (
        <div className="mb-8 grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
          <div className="sm:col-span-2 sm:row-span-2" style={{ aspectRatio: "4/3" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.url} alt={hero.caption} className="h-full w-full object-cover" />
          </div>
          {rest.slice(0, 4).map((p) => (
            <div key={p.id} className="hidden sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={unit.status === "active" ? "good" : unit.status === "maintenance" ? "warn" : "neutral"}>
                {titleCase(unit.status)}
              </Pill>
              {unit.code && <Pill>{unit.code}</Pill>}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><Icon name="users" size={16} /> {unit.capacity} guests</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="bed" size={16} /> {unit.bedrooms} bedroom{unit.bedrooms === 1 ? "" : "s"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="bath" size={16} /> {unit.bathrooms} bathroom{unit.bathrooms === 1 ? "" : "s"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} /> min {unit.min_hours}h</span>
            </p>
            {unit.address && (
              <p className="mt-2 inline-flex items-start gap-1.5 text-[15px] text-ink-2">
                <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
                {unit.address}
              </p>
            )}
            {unit.description && (
              <p className="mt-4 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed">{unit.description}</p>
            )}
          </section>

          {unit.amenities.length > 0 && (
            <section className="border-t border-hairline pt-7">
              <SectionTitle>What this place offers</SectionTitle>
              <ul className="grid gap-3 sm:grid-cols-2">
                {unit.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 text-[15px]">
                    <Icon name={AMENITY_ICONS[a] ?? "check"} size={19} className="text-ink-2" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="border-t border-hairline pt-7">
            <SectionTitle>Photos</SectionTitle>
            <PhotoManager unitId={unit.id} photos={unit.photos} />
          </section>

          <section className="border-t border-hairline pt-7">
            <SectionTitle
              action={
                <Link href="/pricing" className="text-sm font-semibold underline underline-offset-4">
                  Manage rules
                </Link>
              }
            >
              Pricing rules in effect
            </SectionTitle>
            {rules.length ? (
              <ul className="card divide-hair overflow-hidden">
                {rules.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{r.name}</p>
                      <p className="truncate text-[13px] text-ink-2">{describeRule(r)}</p>
                    </div>
                    <Pill tone={r.unit_id ? "info" : "neutral"}>{r.unit_id ? "This unit" : "All units"}</Pill>
                    {!r.active && <Pill tone="warn">Off</Pill>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No rules yet — every hour is charged at the base rate.</p>
            )}
          </section>

          <section className="border-t border-hairline pt-7">
            <SectionTitle>Upcoming bookings</SectionTitle>
            {upcoming.length ? (
              <div className="card divide-hair overflow-hidden">
                {[...upcoming].reverse().map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            ) : (
              <EmptyState icon="calendar" title="Nothing booked ahead" body="This unit is completely free." />
            )}
          </section>
        </div>

        {/* sticky price card */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[22px] font-semibold">
              {idr(unit.base_rate)} <span className="text-[15px] font-normal text-ink-2">/ hour</span>
            </p>
            <dl className="mt-4 space-y-2 text-[14px]">
              <Row label={`Minimum stay`} value={`${unit.min_hours} hours`} />
              <Row label="Cleaning fee" value={idr(unit.cleaning_fee)} />
              <Row label="Extra guest" value={`${idr(unit.extra_guest_fee)} each`} />
            </dl>
            <div className="my-4 border-t border-hairline" />
            <dl className="space-y-2 text-[14px]">
              <Row label="Bookings (30d)" value={String(stats.bookings_30d)} />
              <Row label="Hours sold (30d)" value={`${stats.hours_30d}h`} />
              <Row label="Revenue (30d)" value={idr(stats.revenue_30d)} strong />
              <Row label="Upcoming" value={String(stats.upcoming)} />
            </dl>
            <Link href={`/bookings/new?unit=${unit.id}`} className="btn-primary mt-5 w-full">
              Log a booking
            </Link>
            <Link href={`/schedule?unit=${unit.id}`} className="btn-ghost mt-2 w-full">
              See the schedule
            </Link>
          </div>

          <div className="mt-4 px-1">
            <DangerButton
              url={`/api/units/${unit.id}`}
              confirmText={`Delete "${unit.name}"? Its bookings, photos and pricing rules will be removed too.`}
              redirectTo="/units"
              label="Delete unit"
            />
          </div>
        </aside>
      </div>
    </Page>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-2">{label}</dt>
      <dd className={`tabular ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
