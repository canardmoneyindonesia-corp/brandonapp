import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import DangerButton from "@/components/DangerButton";
import { PaymentForm, StatusSwitcher } from "@/components/BookingActions";
import { Page, PageHeader, Pill, SectionTitle, SourceTag, StatusBadge } from "@/components/ui";
import { getBooking, getBookingPayments } from "@/lib/queries";
import { fmtDateLong, fmtDateTime, fmtTime, hoursLabel, idr, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();

  const booking = await getBooking(id);
  if (!booking) notFound();
  const payments = await getBookingPayments(id);

  // Guests pay on arrival, so this is a record of what was taken, not a debt.
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const unrecorded = booking.total_amount - paid;
  const settled = unrecorded <= 0;
  const waNumber = booking.guest_phone.replace(/\D/g, "");
  const waText = encodeURIComponent(
    `Hi ${booking.guest_name}, this is about your booking ${booking.code} at ${booking.unit_name} on ${fmtDateLong(
      booking.starts_at
    )}, ${fmtTime(booking.starts_at)}–${fmtTime(booking.ends_at)}.`
  );

  return (
    <Page>
      <PageHeader
        title={booking.guest_name}
        subtitle={`${booking.code} · booked ${fmtDateTime(booking.created_at)}`}
        back={{ href: "/bookings", label: "Bookings" }}
        action={
          <div className="flex gap-2">
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
              >
                <Icon name="whatsapp" size={17} />
                Message
              </a>
            )}
            <Link href={`/bookings/new?unit=${booking.unit_id}&guest=${encodeURIComponent(booking.guest_name)}&phone=${encodeURIComponent(booking.guest_phone)}`} className="btn-primary">
              <Icon name="refresh" size={17} />
              Book again
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="panel">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={booking.status} />
              <SourceTag source={booking.source} />
              {settled ? (
                <Pill tone="good">Payment recorded</Pill>
              ) : (
                booking.status !== "cancelled" && <Pill tone="neutral">Payment not recorded</Pill>
              )}
            </div>

            <div className="mt-5 flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-soft">
                {booking.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={booking.cover_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/units/${booking.unit_id}`} className="text-[17px] font-semibold hover:underline">
                  {booking.unit_name}
                </Link>
                <p className="mt-1 text-[15px]">{fmtDateLong(booking.starts_at)}</p>
                <p className="text-[15px] text-ink-2 tabular">
                  {fmtTime(booking.starts_at)} – {fmtTime(booking.ends_at)} · {hoursLabel(booking.hours)}
                </p>
                <p className="mt-1 text-[14px] text-ink-2">
                  {booking.guests} guest{booking.guests > 1 ? "s" : ""}
                  {booking.guest_phone ? ` · ${booking.guest_phone}` : ""}
                </p>
              </div>
            </div>

            {booking.notes && (
              <p className="mt-5 rounded-lg bg-soft px-4 py-3 text-[14px] leading-relaxed">{booking.notes}</p>
            )}
          </section>

          <section className="panel">
            <SectionTitle>Status</SectionTitle>
            <StatusSwitcher bookingId={booking.id} status={booking.status} />
          </section>

          <section className="panel">
            <SectionTitle>Payments</SectionTitle>
            {payments.length ? (
              <ul className="mb-5 divide-y divide-[var(--color-hairline)]">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-soft text-ink-2">
                      <Icon name="wallet" size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold tabular">{idr(p.amount)}</p>
                      <p className="truncate text-[12px] text-ink-2">
                        {titleCase(p.method)} · {fmtDateTime(p.paid_at)}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <DangerButton
                      url={`/api/payments/${p.id}`}
                      confirmText={`Remove this ${idr(p.amount)} payment?`}
                      label="Remove"
                      className="btn btn-sm border border-line bg-white text-ink-2 hover:bg-soft"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-ink-2">Nothing received yet.</p>
            )}
            <PaymentForm bookingId={booking.id} due={Math.max(0, unrecorded)} />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5 shadow-[var(--shadow-card)]">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-2">Price breakdown</p>
            <dl className="mt-3 space-y-2 text-[14px]">
              {(booking.breakdown ?? []).map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <dt className="text-ink-2">{l.label}</dt>
                  <dd className={`shrink-0 tabular ${l.amount < 0 ? "text-[var(--color-good)]" : ""}`}>
                    {l.amount < 0 ? `− ${idr(-l.amount)}` : idr(l.amount)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="my-4 border-t border-hairline" />
            <div className="flex items-center justify-between text-[15px] font-semibold">
              <span>Total</span>
              <span className="tabular">{idr(booking.total_amount)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[14px] text-ink-2">
              <span>Recorded</span>
              <span className="tabular">{idr(paid)}</span>
            </div>
            {!settled && (
              <p className="mt-3 rounded-lg bg-soft px-3 py-2 text-[12px] leading-snug text-ink-2">
                {paid === 0
                  ? "No payment logged yet — record it once the guest pays on arrival."
                  : `${idr(unrecorded)} of this booking has not been logged as a payment.`}
              </p>
            )}
          </div>

          <div className="px-1">
            <DangerButton
              url={`/api/bookings/${booking.id}`}
              confirmText={`Permanently delete booking ${booking.code}? Use "Cancelled" instead if you want to keep the record.`}
              redirectTo="/bookings"
              label="Delete booking"
            />
          </div>
        </aside>
      </div>
    </Page>
  );
}
