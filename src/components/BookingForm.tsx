"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { idr, isoLocal, fmtTime, fmtDateFull } from "@/lib/format";
import type { Quote } from "@/lib/pricing";
import { BOOKING_SOURCES, PAYMENT_METHODS, type UnitWithPhotos } from "@/lib/types";
import { titleCase } from "@/lib/format";

interface Conflict {
  id: number;
  code: string;
  guest_name: string;
  starts_at: string;
  ends_at: string;
}

const DURATIONS = [2, 3, 4, 5, 6, 8, 10, 12, 24];

function defaultStart(dateHint?: string): Date {
  const d = dateHint ? new Date(`${dateHint}T00:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  if (dateHint) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  // Next round hour, at least one hour out.
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function BookingForm({
  units,
  unitHint,
  dateHint,
  guestHint,
  phoneHint,
}: {
  units: UnitWithPhotos[];
  unitHint?: number;
  dateHint?: string;
  guestHint?: string;
  phoneHint?: string;
}) {
  const router = useRouter();
  const bookable = units.filter((u) => u.status === "active");
  const [unitId, setUnitId] = useState<number>(unitHint ?? bookable[0]?.id ?? units[0]?.id ?? 0);
  const unit = units.find((u) => u.id === unitId);

  const [start, setStart] = useState<string>(() => isoLocal(defaultStart(dateHint)));
  const [hours, setHours] = useState<number>(unit?.min_hours ?? 3);
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState(guestHint ?? "");
  const [guestPhone, setGuestPhone] = useState(phoneHint ?? "");
  const [source, setSource] = useState("whatsapp");
  const [status, setStatus] = useState("confirmed");
  const [notes, setNotes] = useState("");
  const [deposit, setDeposit] = useState(0);
  const [depositMethod, setDepositMethod] = useState("transfer");
  const [overrideTotal, setOverrideTotal] = useState<string>("");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [pricing, setPricing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startDate = useMemo(() => new Date(start), [start]);
  const endDate = useMemo(() => new Date(startDate.getTime() + hours * 3_600_000), [startDate, hours]);

  // Keep the duration at or above the selected unit's minimum.
  useEffect(() => {
    if (unit && hours < unit.min_hours) setHours(unit.min_hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  // Live quote — the same function the server will run on submit.
  useEffect(() => {
    if (!unitId || Number.isNaN(startDate.getTime())) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setPricing(true);
      try {
        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unit_id: unitId,
            starts_at: startDate.toISOString(),
            ends_at: endDate.toISOString(),
            guests,
          }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (res.ok) {
          setQuote(json);
          setConflicts(json.conflicts ?? []);
        }
      } catch {
        /* aborted or offline — keep the last good quote */
      } finally {
        setPricing(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [unitId, startDate, endDate, guests]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return setError("Pick a unit first");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          guest_name: guestName,
          guest_phone: guestPhone,
          guests,
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          status,
          source,
          notes,
          deposit_amount: deposit,
          deposit_method: depositMethod,
          override_total: overrideTotal === "" ? undefined : Number(overrideTotal),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not save the booking");
      router.push(`/bookings/${json.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const total = overrideTotal !== "" ? Number(overrideTotal) : (quote?.total ?? 0);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Unit</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {units.map((u) => (
              <label
                key={u.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                  unitId === u.id ? "border-ink ring-1 ring-ink" : "border-hairline hover:border-line"
                } ${u.status !== "active" ? "opacity-60" : ""}`}
              >
                <input
                  type="radio" name="unit" className="sr-only" checked={unitId === u.id}
                  onChange={() => setUnitId(u.id)}
                />
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-soft">
                  {u.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.photos[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{u.name}</span>
                  <span className="block truncate text-[12px] text-ink-2">
                    {idr(u.base_rate)}/h · min {u.min_hours}h · {u.capacity} guests
                  </span>
                </span>
                {unitId === u.id && <Icon name="check" size={18} className="shrink-0 text-rausch" />}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">When</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="start">Check-in</label>
              <input
                id="start" type="datetime-local" className="input-lg" required value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <span className="label">Check-out</span>
              <div className="input-lg flex items-center justify-between bg-soft">
                <span className="tabular">{Number.isNaN(endDate.getTime()) ? "—" : fmtTime(endDate)}</span>
                <span className="text-[13px] text-ink-2">
                  {Number.isNaN(endDate.getTime()) ? "" : fmtDateFull(endDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <span className="label">Duration</span>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {DURATIONS.filter((h) => !unit || h >= unit.min_hours).map((h) => (
                <button
                  key={h} type="button" onClick={() => setHours(h)}
                  className={`chip ${hours === h ? "chip-active" : ""}`}
                >
                  {h}h
                </button>
              ))}
              <input
                type="number" min={unit?.min_hours ?? 1} max={72} value={hours}
                onChange={(e) => setHours(Math.max(1, Number(e.target.value)))}
                className="w-20 rounded-full border border-line px-3 py-1.5 text-center text-[13px] tabular"
                aria-label="Custom duration in hours"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="guests">Guests</label>
            <input
              id="guests" type="number" min={1} max={20} className="input w-32 tabular" value={guests}
              onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
            />
            {unit && guests > unit.capacity && (
              <p className="hint text-[var(--color-warn)]">
                Over the {unit.capacity}-guest capacity — an extra guest fee applies.
              </p>
            )}
          </div>

          {conflicts.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#e3b5aa] bg-[var(--color-bad-soft)] p-3">
              <p className="text-[13px] font-semibold text-[var(--color-bad)]">
                This slot overlaps an existing booking
              </p>
              <ul className="mt-1.5 space-y-1 text-[13px] text-ink">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.guest_name} · {fmtTime(c.starts_at)}–{fmtTime(c.ends_at)} ({c.code})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>

        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">Guest</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="guest_name">Name</label>
              <input
                id="guest_name" className="input" required value={guestName}
                placeholder="Andi Pratama" onChange={(e) => setGuestName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="guest_phone">WhatsApp number</label>
              <input
                id="guest_phone" className="input" value={guestPhone} placeholder="+62 812-…"
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="source">Came from</label>
              <select id="source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>{titleCase(s)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="inquiry">Inquiry — not confirmed</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked in</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Notes</label>
              <textarea
                id="notes" className="input" value={notes} placeholder="Late check-in, extra towels, door code…"
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="panel">
          <legend className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-2">
            Payment taken now
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="deposit">Amount received</label>
              <input
                id="deposit" type="number" min={0} step={1000} className="input tabular" value={deposit}
                onChange={(e) => setDeposit(Math.max(0, Number(e.target.value)))}
              />
              <div className="mt-2 flex gap-2">
                <button type="button" className="chip" onClick={() => setDeposit(Math.round(total / 2 / 1000) * 1000)}>
                  50% deposit
                </button>
                <button type="button" className="chip" onClick={() => setDeposit(total)}>
                  Paid in full
                </button>
                <button type="button" className="chip" onClick={() => setDeposit(0)}>
                  Nothing yet
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="method">Method</label>
              <select id="method" className="input" value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{titleCase(m)}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      </div>

      {/* quote card */}
      <aside className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-baseline justify-between">
            <p className="text-[20px] font-semibold">{idr(total)}</p>
            {pricing && <span className="text-[12px] text-ink-2">pricing…</span>}
          </div>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {quote ? `${quote.hours} hours` : "—"}
            {unit ? ` · ${unit.name}` : ""}
          </p>

          <div className="my-4 border-t border-hairline" />

          <dl className="space-y-2 text-[14px]">
            {quote?.lines.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <dt className={`${l.kind === "discount" ? "text-[var(--color-good)]" : "text-ink-2"} ${l.kind === "adjust" ? "text-ink-2" : ""}`}>
                  {l.label}
                </dt>
                <dd className={`shrink-0 tabular ${l.amount < 0 ? "text-[var(--color-good)]" : ""}`}>
                  {l.amount < 0 ? `− ${idr(-l.amount)}` : idr(l.amount)}
                </dd>
              </div>
            ))}
            {!quote?.lines.length && <p className="text-[13px] text-ink-2">Pick a unit and time to see the price.</p>}
          </dl>

          <div className="my-4 border-t border-hairline" />
          <div className="flex items-center justify-between text-[15px] font-semibold">
            <span>Total</span>
            <span className="tabular">{idr(total)}</span>
          </div>
          {deposit > 0 && (
            <div className="mt-1.5 flex items-center justify-between text-[13px] text-ink-2">
              <span>Balance after deposit</span>
              <span className="tabular">{idr(Math.max(0, total - deposit))}</span>
            </div>
          )}

          {quote?.warnings.map((w) => (
            <p key={w} className="mt-3 rounded-lg bg-[var(--color-warn-soft)] px-3 py-2 text-[12px] text-[var(--color-warn)]">
              {w}
            </p>
          ))}

          <details className="mt-4">
            <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Override the total</summary>
            <input
              type="number" min={0} step={1000} className="input mt-2 tabular" value={overrideTotal}
              placeholder={String(quote?.total ?? 0)}
              onChange={(e) => setOverrideTotal(e.target.value)}
            />
            <p className="hint">Use for a negotiated price. Leave blank to charge the calculated total.</p>
          </details>

          {error && (
            <p className="mt-3 rounded-lg border border-[#e3b5aa] bg-[var(--color-bad-soft)] px-3 py-2 text-[13px] text-[var(--color-bad)]">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full" disabled={saving || !guestName}>
            {saving ? "Saving…" : "Confirm booking"}
          </button>
          {conflicts.length > 0 && (
            <p className="mt-2 text-center text-[12px] text-[var(--color-bad)]">
              The overlap above will be rejected on save.
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}
