"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { Pill } from "./ui";
import { describeRule, quoteBooking } from "@/lib/pricing";
import { idr, isoLocal } from "@/lib/format";
import type { PricingRule, RuleKind, UnitWithPhotos } from "@/lib/types";

const KIND_LABELS: Record<RuleKind, string> = {
  day_of_week: "Day of week",
  time_of_day: "Time of day",
  date_range: "Date range",
  duration: "Duration discount",
  fee: "Extra fee",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PricingClient({
  rules,
  units,
}: {
  rules: PricingRule[];
  units: UnitWithPhotos[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function toggle(rule: PricingRule) {
    setBusy(rule.id);
    setError(null);
    try {
      const res = await fetch(`/api/pricing-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rule.active }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not update");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(rule: PricingRule) {
    if (!confirm(`Delete the rule "${rule.name}"?`)) return;
    setBusy(rule.id);
    try {
      await fetch(`/api/pricing-rules/${rule.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Rules</h2>
          <button type="button" className="btn-primary btn-sm" onClick={() => setAdding((v) => !v)}>
            <Icon name={adding ? "x" : "plus"} size={16} />
            {adding ? "Close" : "Add rule"}
          </button>
        </div>

        {adding && <RuleForm units={units} onDone={() => { setAdding(false); router.refresh(); }} />}

        {error && (
          <p className="rounded-lg border border-[#e3b5aa] bg-[var(--color-bad-soft)] px-3 py-2 text-[13px] text-[var(--color-bad)]">
            {error}
          </p>
        )}

        <ul className="card divide-hair overflow-hidden">
          {rules.map((r) => (
            <li key={r.id} className={`flex items-center gap-3 px-4 py-3.5 ${r.active ? "" : "opacity-60"}`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-soft text-ink-2">
                <Icon
                  name={
                    r.kind === "duration" ? "clock" : r.kind === "fee" ? "wallet" : r.kind === "date_range" ? "calendar" : "pricing"
                  }
                  size={16}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{r.name}</p>
                <p className="truncate text-[13px] text-ink-2">{describeRule(r)}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Pill>{KIND_LABELS[r.kind]}</Pill>
                  <Pill tone={r.unit_id ? "info" : "neutral"}>{r.unit_name ?? "All units"}</Pill>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => toggle(r)}
                  className={`chip btn-sm ${r.active ? "chip-active" : ""}`}
                >
                  {r.active ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => remove(r)}
                  className="text-[12px] text-ink-2 underline underline-offset-2 hover:text-[var(--color-bad)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!rules.length && (
            <li className="px-4 py-10 text-center text-sm text-ink-2">
              No rules yet — every hour is charged at each unit&apos;s base rate.
            </li>
          )}
        </ul>
      </div>

      <div className="lg:col-span-2">
        <Simulator units={units} rules={rules} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- new rule --- */

function RuleForm({ units, onDone }: { units: UnitWithPhotos[]; onDone: () => void }) {
  const [kind, setKind] = useState<RuleKind>("day_of_week");
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [adjust, setAdjust] = useState(20);
  const [days, setDays] = useState<number[]>([5, 6]);
  const [fromHour, setFromHour] = useState(22);
  const [toHour, setToHour] = useState(6);
  const [start, setStart] = useState("12-20");
  const [end, setEnd] = useState("01-05");
  const [minHours, setMinHours] = useState(6);
  const [amount, setAmount] = useState(50000);
  const [per, setPer] = useState("booking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pricing-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name,
          unit_id: unitId || null,
          adjust_pct: adjust,
          days,
          from_hour: fromHour,
          to_hour: toHour,
          start,
          end,
          min_hours: minHours,
          amount,
          per,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save the rule");
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="rule_kind">Rule type</label>
          <select id="rule_kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as RuleKind)}>
            {(Object.keys(KIND_LABELS) as RuleKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rule_unit">Applies to</label>
          <select id="rule_unit" className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">All units</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="rule_name">Name</label>
          <input
            id="rule_name" className="input" required value={name} placeholder="Weekend surcharge"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {kind === "day_of_week" && (
        <div>
          <span className="label">Days</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button
                key={d} type="button"
                className={`chip ${days.includes(i) ? "chip-active" : ""}`}
                onClick={() => setDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {kind === "time_of_day" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="from_hour">From hour</label>
            <input id="from_hour" type="number" min={0} max={23} className="input tabular" value={fromHour}
              onChange={(e) => setFromHour(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="to_hour">To hour</label>
            <input id="to_hour" type="number" min={0} max={24} className="input tabular" value={toHour}
              onChange={(e) => setToHour(Number(e.target.value))} />
            <p className="hint">Wraps past midnight, e.g. 22 → 6.</p>
          </div>
        </div>
      )}

      {kind === "date_range" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="range_start">Start</label>
            <input id="range_start" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="range_end">End</label>
            <input id="range_end" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            <p className="hint">MM-DD repeats yearly; YYYY-MM-DD is one-off.</p>
          </div>
        </div>
      )}

      {kind === "duration" && (
        <div>
          <label className="label" htmlFor="min_hours">Applies from this many hours</label>
          <input id="min_hours" type="number" min={1} max={48} className="input w-32 tabular" value={minHours}
            onChange={(e) => setMinHours(Number(e.target.value))} />
        </div>
      )}

      {kind === "fee" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="fee_amount">Amount (IDR)</label>
            <input id="fee_amount" type="number" min={0} step={1000} className="input tabular" value={amount}
              onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="fee_per">Charged</label>
            <select id="fee_per" className="input" value={per} onChange={(e) => setPer(e.target.value)}>
              <option value="booking">Once per booking</option>
              <option value="hour">Per hour</option>
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="adjust">Adjustment (%)</label>
          <input id="adjust" type="number" step={1} className="input w-32 tabular" value={adjust}
            onChange={(e) => setAdjust(Number(e.target.value))} />
          <p className="hint">Positive raises the rate, negative discounts it.</p>
        </div>
      )}

      {error && <p className="text-[13px] text-[var(--color-bad)]">{error}</p>}

      <button type="submit" className="btn-dark" disabled={busy}>
        {busy ? "Saving…" : "Create rule"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------- simulator --- */

function Simulator({ units, rules }: { units: UnitWithPhotos[]; rules: PricingRule[] }) {
  const bookable = units.filter((u) => u.status === "active");
  const [unitId, setUnitId] = useState(bookable[0]?.id ?? units[0]?.id ?? 0);
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return isoLocal(d);
  });
  const [hours, setHours] = useState(4);
  const [guests, setGuests] = useState(2);

  const unit = units.find((u) => u.id === unitId);

  useEffect(() => {
    if (unit && hours < unit.min_hours) setHours(unit.min_hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const quote = useMemo(() => {
    if (!unit) return null;
    const start = new Date(when);
    if (Number.isNaN(start.getTime())) return null;
    return quoteBooking({
      unit,
      rules,
      start,
      end: new Date(start.getTime() + hours * 3_600_000),
      guests,
    });
  }, [unit, rules, when, hours, guests]);

  return (
    <div className="card p-5 lg:sticky lg:top-6">
      <p className="text-[15px] font-semibold">Price simulator</p>
      <p className="mt-0.5 text-[13px] text-ink-2">
        Runs the exact engine used at booking time — no round trip to the server.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="label" htmlFor="sim_unit">Unit</label>
          <select id="sim_unit" className="input" value={unitId} onChange={(e) => setUnitId(Number(e.target.value))}>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sim_when">Check-in</label>
          <input id="sim_when" type="datetime-local" className="input" value={when}
            onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sim_hours">Hours</label>
            <input id="sim_hours" type="number" min={1} max={48} className="input tabular" value={hours}
              onChange={(e) => setHours(Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <label className="label" htmlFor="sim_guests">Guests</label>
            <input id="sim_guests" type="number" min={1} max={20} className="input tabular" value={guests}
              onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
      </div>

      <div className="my-4 border-t border-hairline" />

      <dl className="space-y-2 text-[14px]">
        {quote?.lines.map((l, i) => (
          <div key={i} className="flex items-start justify-between gap-3">
            <dt className="text-ink-2">{l.label}</dt>
            <dd className={`shrink-0 tabular ${l.amount < 0 ? "text-[var(--color-good)]" : ""}`}>
              {l.amount < 0 ? `− ${idr(-l.amount)}` : idr(l.amount)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="my-4 border-t border-hairline" />
      <div className="flex items-center justify-between text-[16px] font-semibold">
        <span>Total</span>
        <span className="tabular">{idr(quote?.total ?? 0)}</span>
      </div>
      {quote && quote.hours > 0 && (
        <p className="mt-1 text-right text-[12px] text-ink-2 tabular">
          {idr(Math.round(quote.total / quote.hours))} effective per hour
        </p>
      )}
      {quote?.warnings.map((w) => (
        <p key={w} className="mt-3 rounded-lg bg-[var(--color-warn-soft)] px-3 py-2 text-[12px] text-[var(--color-warn)]">
          {w}
        </p>
      ))}
    </div>
  );
}
