import type { PricingRule, Unit } from "./types";

// Pure, isomorphic pricing engine — the booking form calls it on every
// keystroke in the browser, and the API calls it again on the server so a
// tampered client can't set its own price.

export interface QuoteLine {
  label: string;
  amount: number;
  kind: "base" | "adjust" | "discount" | "fee";
}

export interface Quote {
  hours: number;
  baseAmount: number;
  discountAmount: number;
  feesAmount: number;
  total: number;
  lines: QuoteLine[];
  warnings: string[];
}

const round1k = (n: number) => Math.round(n / 1000) * 1000;

const pct = (params: Record<string, unknown>): number => Number(params.adjust_pct ?? 0);

/** Handles wrap-around windows like 22:00 → 06:00. */
function inHourWindow(hour: number, from: number, to: number): boolean {
  if (from === to) return true;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

/** Accepts "MM-DD" (recurs yearly) or "YYYY-MM-DD" (one-off). */
function inDateRange(date: Date, start: string, end: string): boolean {
  const asKey = (s: string) => (s.length > 5 ? s.slice(5) : s);
  const yearly = start.length <= 5 && end.length <= 5;
  if (!yearly) {
    const t = date.getTime();
    return t >= new Date(`${start}T00:00:00`).getTime() && t <= new Date(`${end}T23:59:59`).getTime();
  }
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const s = asKey(start);
  const e = asKey(end);
  return s <= e ? key >= s && key <= e : key >= s || key <= e; // wraps New Year
}

export function applicableRules(rules: PricingRule[], unitId: number): PricingRule[] {
  return rules
    .filter((r) => r.active && (r.unit_id === null || r.unit_id === unitId))
    .sort((a, b) => a.priority - b.priority);
}

export function quoteBooking({
  unit,
  rules,
  start,
  end,
  guests,
}: {
  unit: Pick<Unit, "id" | "base_rate" | "min_hours" | "cleaning_fee" | "extra_guest_fee" | "capacity">;
  rules: PricingRule[];
  start: Date;
  end: Date;
  guests: number;
}): Quote {
  const warnings: string[] = [];
  const rawHours = (end.getTime() - start.getTime()) / 3_600_000;

  if (!Number.isFinite(rawHours) || rawHours <= 0) {
    return { hours: 0, baseAmount: 0, discountAmount: 0, feesAmount: 0, total: 0, lines: [], warnings: ["Check-out must be after check-in."] };
  }

  let hours = Math.ceil(rawHours - 1e-9);
  if (hours < unit.min_hours) {
    warnings.push(`Minimum booking is ${unit.min_hours} hours — charged as ${unit.min_hours}h.`);
    hours = unit.min_hours;
  }

  const active = applicableRules(rules, unit.id);
  const perHour = active.filter((r) => r.kind === "day_of_week" || r.kind === "time_of_day" || r.kind === "date_range");
  const durationRules = active.filter((r) => r.kind === "duration");
  const feeRules = active.filter((r) => r.kind === "fee");

  // Walk the booking hour by hour, attributing each rule's contribution so the
  // guest sees exactly why the price moved.
  const attribution = new Map<number, number>();
  const cursor = new Date(start);
  let baseAmount = 0;

  for (let h = 0; h < hours; h++) {
    let rate = unit.base_rate;
    for (const rule of perHour) {
      const p = rule.params as Record<string, unknown>;
      let matches = false;
      if (rule.kind === "day_of_week") {
        const days = (p.days as number[]) ?? [];
        matches = days.includes(cursor.getDay());
      } else if (rule.kind === "time_of_day") {
        matches = inHourWindow(cursor.getHours(), Number(p.from_hour ?? 0), Number(p.to_hour ?? 0));
      } else if (rule.kind === "date_range") {
        matches = inDateRange(cursor, String(p.start ?? ""), String(p.end ?? ""));
      }
      if (!matches) continue;
      const delta = rate * (pct(p) / 100);
      attribution.set(rule.id, (attribution.get(rule.id) ?? 0) + delta);
      rate += delta;
    }
    baseAmount += rate;
    cursor.setHours(cursor.getHours() + 1);
  }

  const plain = round1k(hours * unit.base_rate);
  const lines: QuoteLine[] = [
    { label: `${hours} h × ${new Intl.NumberFormat("id-ID").format(unit.base_rate)}`, amount: plain, kind: "base" },
  ];

  let adjustTotal = 0;
  for (const rule of perHour) {
    const raw = attribution.get(rule.id);
    if (!raw) continue;
    const amount = round1k(raw);
    if (amount === 0) continue;
    adjustTotal += amount;
    lines.push({ label: `${rule.name} (${pct(rule.params) > 0 ? "+" : ""}${pct(rule.params)}%)`, amount, kind: "adjust" });
  }

  const subtotal = plain + adjustTotal;

  // Only the most generous qualifying duration rule applies.
  let discountAmount = 0;
  const best = durationRules
    .filter((r) => hours >= Number((r.params as Record<string, unknown>).min_hours ?? 0))
    .sort((a, b) => Number((b.params as Record<string, unknown>).min_hours ?? 0) - Number((a.params as Record<string, unknown>).min_hours ?? 0))[0];
  if (best) {
    const amount = round1k(subtotal * (pct(best.params) / 100));
    if (amount !== 0) {
      discountAmount = Math.abs(amount);
      lines.push({ label: `${best.name} (${pct(best.params)}%)`, amount, kind: "discount" });
    }
  }

  let feesAmount = 0;
  if (unit.cleaning_fee > 0) {
    feesAmount += unit.cleaning_fee;
    lines.push({ label: "Cleaning fee", amount: unit.cleaning_fee, kind: "fee" });
  }
  const extraGuests = Math.max(0, guests - unit.capacity);
  if (extraGuests > 0 && unit.extra_guest_fee > 0) {
    const amount = extraGuests * unit.extra_guest_fee;
    feesAmount += amount;
    lines.push({ label: `Extra guest × ${extraGuests}`, amount, kind: "fee" });
    warnings.push(`${guests} guests is over the ${unit.capacity}-guest capacity.`);
  }
  for (const rule of feeRules) {
    const p = rule.params as Record<string, unknown>;
    const per = String(p.per ?? "booking");
    const amount = round1k(Number(p.amount ?? 0) * (per === "hour" ? hours : 1));
    if (!amount) continue;
    feesAmount += amount;
    lines.push({ label: rule.name + (per === "hour" ? ` (× ${hours}h)` : ""), amount, kind: "fee" });
  }

  const total = subtotal - discountAmount + feesAmount;

  return {
    hours,
    baseAmount: subtotal,
    discountAmount,
    feesAmount,
    total,
    lines,
    warnings,
  };
}

/** Human summary of a rule's params, used in the pricing list. */
export function describeRule(rule: PricingRule): string {
  const p = rule.params as Record<string, unknown>;
  const sign = pct(p) > 0 ? `+${pct(p)}%` : `${pct(p)}%`;
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  switch (rule.kind) {
    case "day_of_week":
      return `${sign} on ${((p.days as number[]) ?? []).map((d) => DAYS[d]).join(", ") || "—"}`;
    case "time_of_day":
      return `${sign} between ${String(p.from_hour).padStart(2, "0")}:00 and ${String(p.to_hour).padStart(2, "0")}:00`;
    case "date_range":
      return `${sign} from ${p.start} to ${p.end}`;
    case "duration":
      return `${sign} for bookings of ${p.min_hours}h or more`;
    case "fee":
      return `+Rp ${new Intl.NumberFormat("id-ID").format(Number(p.amount ?? 0))} per ${p.per ?? "booking"}`;
    default:
      return "";
  }
}
