// IDR amounts, English labels. Rupiah has no working minor unit, so every
// money value in this app is a whole-number of rupiah.

const NUM = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function idr(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return `Rp ${NUM.format(Math.round(n))}`;
}

/** Compact form for chart axes and tight stat tiles: Rp 1,2M / Rp 350rb. */
export function idrShort(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".", ",")}jt`;
  if (abs >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`;
  return `Rp ${n}`;
}

export const num = (n: number) => NUM.format(n);

/* ------------------------------------------------------------- dates --- */

const D_SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const D_FULL = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const D_LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const T = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

const d = (v: string | Date) => (v instanceof Date ? v : new Date(v));

export const fmtDate = (v: string | Date) => D_SHORT.format(d(v));
export const fmtDateFull = (v: string | Date) => D_FULL.format(d(v));
export const fmtDateLong = (v: string | Date) => D_LONG.format(d(v));
export const fmtTime = (v: string | Date) => T.format(d(v));
export const fmtMonth = (v: string | Date) => MONTH.format(d(v));

export const fmtRange = (a: string | Date, b: string | Date) =>
  `${fmtTime(a)} – ${fmtTime(b)}`;

export const fmtDateTime = (v: string | Date) => `${fmtDateFull(v)} · ${fmtTime(v)}`;

/** "in 3h", "2 days ago", "just now" */
export function fmtRelative(v: string | Date): string {
  const diff = d(v).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  if (mins < 1) return "just now";
  const past = diff < 0;
  const fmt = (n: number, unit: string) =>
    past ? `${n}${unit} ago` : `in ${n}${unit}`;
  if (mins < 60) return fmt(mins, "m");
  const hours = Math.round(mins / 60);
  if (hours < 24) return fmt(hours, "h");
  const days = Math.round(hours / 24);
  if (days < 7) return fmt(days, "d");
  return fmtDate(v);
}

/** Chat-list timestamp: today shows the clock, otherwise the date. */
export function fmtChatStamp(v: string | Date): string {
  const dt = d(v);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dt.getTime() >= today.getTime()) return fmtTime(dt);
  const yesterday = new Date(today.getTime() - 86400000);
  if (dt.getTime() >= yesterday.getTime()) return "Yesterday";
  return fmtDate(dt);
}

export const hoursLabel = (h: number | string) => {
  const n = Number(h);
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1).replace(".0", "")}h`;
};

/* ------------------------------------------------- date-only helpers --- */

/** Local YYYY-MM-DD (never UTC — that shifts the day for +07:00). */
export function isoDate(v: Date = new Date()): string {
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(
    v.getDate()
  ).padStart(2, "0")}`;
}

/** Value for <input type="datetime-local"> in local time. */
export function isoLocal(v: Date): string {
  return `${isoDate(v)}T${String(v.getHours()).padStart(2, "0")}:${String(
    v.getMinutes()
  ).padStart(2, "0")}`;
}

export function startOfDay(v: Date = new Date()): Date {
  const x = new Date(v);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(v: Date, n: number): Date {
  const x = new Date(v);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeek(v: Date = new Date()): Date {
  const x = startOfDay(v);
  const dow = (x.getDay() + 6) % 7; // Monday-first
  return addDays(x, -dow);
}

export function startOfMonth(v: Date = new Date()): Date {
  const x = startOfDay(v);
  x.setDate(1);
  return x;
}

export function endOfMonth(v: Date = new Date()): Date {
  const x = startOfMonth(v);
  x.setMonth(x.getMonth() + 1);
  return x;
}

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
