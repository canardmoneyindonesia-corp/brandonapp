import { query, one } from "./db";
import type {
  Booking,
  BookingWithUnit,
  Expense,
  Payment,
  PricingRule,
  Unit,
  UnitPhoto,
  UnitWithPhotos,
  WaContact,
  WaMessage,
} from "./types";
import { addDays, startOfDay, startOfMonth } from "./format";

const BOOKING_SELECT = `
  b.*,
  u.name  AS unit_name,
  u.code  AS unit_code,
  (SELECT p.url FROM unit_photos p WHERE p.unit_id = u.id ORDER BY p.is_cover DESC, p.sort_order LIMIT 1) AS cover_url,
  COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.booking_id = b.id), 0) AS paid_amount
`;

const LIVE = `b.status NOT IN ('cancelled','no_show')`;

/* --------------------------------------------------------------- units --- */

export async function getUnits(): Promise<UnitWithPhotos[]> {
  const units = await query<Unit>(`SELECT * FROM units ORDER BY status, name`);
  if (!units.length) return [];
  const photos = await query<UnitPhoto>(
    `SELECT * FROM unit_photos WHERE unit_id = ANY($1) ORDER BY is_cover DESC, sort_order`,
    [units.map((u) => u.id)]
  );
  return units.map((u) => ({ ...u, photos: photos.filter((p) => p.unit_id === u.id) }));
}

export async function getUnit(id: number): Promise<UnitWithPhotos | null> {
  const unit = await one<Unit>(`SELECT * FROM units WHERE id = $1`, [id]);
  if (!unit) return null;
  const photos = await query<UnitPhoto>(
    `SELECT * FROM unit_photos WHERE unit_id = $1 ORDER BY is_cover DESC, sort_order`,
    [id]
  );
  return { ...unit, photos };
}

export interface UnitStats {
  bookings_30d: number;
  hours_30d: number;
  revenue_30d: number;
  upcoming: number;
}

export async function getUnitStats(id: number): Promise<UnitStats> {
  const row = await one<UnitStats>(
    `SELECT
       COUNT(*) FILTER (WHERE b.starts_at >= now() - interval '30 days' AND ${LIVE})::int AS bookings_30d,
       COALESCE(SUM(b.hours) FILTER (WHERE b.starts_at >= now() - interval '30 days' AND ${LIVE}), 0) AS hours_30d,
       COALESCE(SUM(b.total_amount) FILTER (WHERE b.starts_at >= now() - interval '30 days' AND ${LIVE}), 0) AS revenue_30d,
       COUNT(*) FILTER (WHERE b.starts_at >= now() AND ${LIVE})::int AS upcoming
     FROM bookings b WHERE b.unit_id = $1`,
    [id]
  );
  return row ?? { bookings_30d: 0, hours_30d: 0, revenue_30d: 0, upcoming: 0 };
}

/* ------------------------------------------------------ pricing rules --- */

export async function getPricingRules(unitId?: number): Promise<PricingRule[]> {
  return query<PricingRule>(
    `SELECT r.*, u.name AS unit_name
       FROM pricing_rules r
       LEFT JOIN units u ON u.id = r.unit_id
      ${unitId ? "WHERE r.unit_id = $1 OR r.unit_id IS NULL" : ""}
      ORDER BY r.priority, r.id`,
    unitId ? [unitId] : []
  );
}

/* ------------------------------------------------------------ bookings --- */

export interface BookingFilter {
  from?: Date;
  to?: Date;
  unitId?: number;
  status?: string;
  search?: string;
  limit?: number;
}

export async function getBookings(f: BookingFilter = {}): Promise<BookingWithUnit[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.from) {
    params.push(f.from);
    where.push(`b.ends_at >= $${params.length}`);
  }
  if (f.to) {
    params.push(f.to);
    where.push(`b.starts_at < $${params.length}`);
  }
  if (f.unitId) {
    params.push(f.unitId);
    where.push(`b.unit_id = $${params.length}`);
  }
  if (f.status && f.status !== "all") {
    params.push(f.status);
    where.push(`b.status = $${params.length}`);
  }
  if (f.search) {
    params.push(`%${f.search}%`);
    where.push(`(b.guest_name ILIKE $${params.length} OR b.guest_phone ILIKE $${params.length} OR b.code ILIKE $${params.length})`);
  }
  params.push(f.limit ?? 200);
  return query<BookingWithUnit>(
    `SELECT ${BOOKING_SELECT}
       FROM bookings b JOIN units u ON u.id = b.unit_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY b.starts_at DESC
      LIMIT $${params.length}`,
    params
  );
}

export async function getBooking(id: number): Promise<BookingWithUnit | null> {
  return one<BookingWithUnit>(
    `SELECT ${BOOKING_SELECT} FROM bookings b JOIN units u ON u.id = b.unit_id WHERE b.id = $1`,
    [id]
  );
}

export async function getBookingPayments(id: number): Promise<Payment[]> {
  return query<Payment>(`SELECT * FROM payments WHERE booking_id = $1 ORDER BY paid_at`, [id]);
}

/** Every booking that touches the given day, ordered for the timeline. */
export async function getScheduleDay(day: Date): Promise<BookingWithUnit[]> {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  return query<BookingWithUnit>(
    `SELECT ${BOOKING_SELECT}
       FROM bookings b JOIN units u ON u.id = b.unit_id
      WHERE b.starts_at < $2 AND b.ends_at > $1 AND ${LIVE}
      ORDER BY b.starts_at`,
    [from, to]
  );
}

export async function getScheduleRange(from: Date, to: Date): Promise<BookingWithUnit[]> {
  return query<BookingWithUnit>(
    `SELECT ${BOOKING_SELECT}
       FROM bookings b JOIN units u ON u.id = b.unit_id
      WHERE b.starts_at < $2 AND b.ends_at > $1 AND ${LIVE}
      ORDER BY b.starts_at`,
    [from, to]
  );
}

/* ----------------------------------------------------------- dashboard --- */

// Guests settle on arrival, so this business has no receivables — nothing here
// tracks a balance owed.
export interface DashboardKpis {
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  expenses_month: number;
  bookings_today: number;
  bookings_week: number;
  hours_today: number;
  hours_month: number;
  active_units: number;
  unread_messages: number;
}

export async function getDashboard(): Promise<DashboardKpis> {
  const row = await one<DashboardKpis>(
    `SELECT
      COALESCE((SELECT SUM(total_amount) FROM bookings
                 WHERE starts_at >= date_trunc('day', now())
                   AND starts_at <  date_trunc('day', now()) + interval '1 day'
                   AND status NOT IN ('cancelled','no_show')), 0) AS revenue_today,
      COALESCE((SELECT SUM(total_amount) FROM bookings
                 WHERE starts_at >= date_trunc('month', now())
                   AND status NOT IN ('cancelled','no_show')), 0) AS revenue_month,
      COALESCE((SELECT SUM(amount) FROM expenses
                 WHERE incurred_on >= date_trunc('month', now())::date), 0) AS expenses_month,
      (SELECT COUNT(*) FROM bookings
         WHERE starts_at >= date_trunc('day', now())
           AND starts_at <  date_trunc('day', now()) + interval '1 day'
           AND status NOT IN ('cancelled','no_show'))::int AS bookings_today,
      COALESCE((SELECT SUM(hours) FROM bookings
                 WHERE starts_at >= date_trunc('day', now())
                   AND starts_at <  date_trunc('day', now()) + interval '1 day'
                   AND status NOT IN ('cancelled','no_show')), 0) AS hours_today,
      COALESCE((SELECT SUM(hours) FROM bookings
                 WHERE starts_at >= date_trunc('month', now())
                   AND status NOT IN ('cancelled','no_show')), 0) AS hours_month,
      (SELECT COUNT(*) FROM units WHERE status = 'active')::int AS active_units,
      COALESCE((SELECT SUM(unread) FROM wa_contacts), 0)::int AS unread_messages,
      COALESCE((SELECT SUM(total_amount) FROM bookings
                 WHERE starts_at >= now() AND starts_at < now() + interval '7 days'
                   AND status NOT IN ('cancelled','no_show')), 0) AS revenue_week,
      (SELECT COUNT(*) FROM bookings
         WHERE starts_at >= now() AND starts_at < now() + interval '7 days'
           AND status NOT IN ('cancelled','no_show'))::int AS bookings_week`
  );
  return (
    row ?? {
      revenue_today: 0, revenue_week: 0, revenue_month: 0, expenses_month: 0,
      bookings_today: 0, bookings_week: 0, hours_today: 0, hours_month: 0,
      active_units: 0, unread_messages: 0,
    }
  );
}

/* -------------------------------------------------------------- income --- */

export interface DailyPoint {
  day: string;
  revenue: number;
  expenses: number;
}

export interface UnitRevenue {
  unit_id: number;
  unit_name: string;
  bookings: number;
  hours: number;
  revenue: number;
  expenses: number;
}

export interface IncomeReport {
  monthStart: Date;
  revenue: number;
  expenses: number;
  collected: number;
  bookings: number;
  hours: number;
  prevRevenue: number;
  daily: DailyPoint[];
  byUnit: UnitRevenue[];
  byMethod: { method: string; amount: number; count: number }[];
  byCategory: { category: string; amount: number }[];
  recentExpenses: Expense[];
}

export async function getIncome(month: Date): Promise<IncomeReport> {
  const from = startOfMonth(month);
  const to = new Date(from);
  to.setMonth(to.getMonth() + 1);
  const prevFrom = new Date(from);
  prevFrom.setMonth(prevFrom.getMonth() - 1);

  const [totals, daily, byUnit, byMethod, byCategory, recentExpenses, prev] = await Promise.all([
    one<{ revenue: number; bookings: number; hours: number; collected: number }>(
      `SELECT
         COALESCE(SUM(b.total_amount), 0) AS revenue,
         COUNT(*)::int AS bookings,
         COALESCE(SUM(b.hours), 0) AS hours,
         COALESCE((SELECT SUM(amount) FROM payments WHERE paid_at >= $1 AND paid_at < $2), 0) AS collected
       FROM bookings b
       WHERE b.starts_at >= $1 AND b.starts_at < $2 AND ${LIVE}`,
      [from, to]
    ),
    query<DailyPoint>(
      `WITH days AS (
         SELECT generate_series($1::date, ($2::date - 1), interval '1 day')::date AS day
       )
       SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
         COALESCE((SELECT SUM(total_amount) FROM bookings b
                    WHERE b.starts_at::date = d.day AND ${LIVE}), 0) AS revenue,
         COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.incurred_on = d.day), 0) AS expenses
       FROM days d ORDER BY d.day`,
      [from, to]
    ),
    query<UnitRevenue>(
      `SELECT u.id AS unit_id, u.name AS unit_name,
         COUNT(b.id)::int AS bookings,
         COALESCE(SUM(b.hours), 0) AS hours,
         COALESCE(SUM(b.total_amount), 0) AS revenue,
         COALESCE((SELECT SUM(e.amount) FROM expenses e
                    WHERE e.unit_id = u.id AND e.incurred_on >= $1::date AND e.incurred_on < $2::date), 0) AS expenses
       FROM units u
       LEFT JOIN bookings b ON b.unit_id = u.id AND b.starts_at >= $1 AND b.starts_at < $2 AND ${LIVE}
       GROUP BY u.id, u.name ORDER BY revenue DESC`,
      [from, to]
    ),
    query<{ method: string; amount: number; count: number }>(
      `SELECT method, SUM(amount) AS amount, COUNT(*)::int AS count
         FROM payments WHERE paid_at >= $1 AND paid_at < $2
        GROUP BY method ORDER BY amount DESC`,
      [from, to]
    ),
    query<{ category: string; amount: number }>(
      `SELECT category, SUM(amount) AS amount FROM expenses
        WHERE incurred_on >= $1::date AND incurred_on < $2::date
        GROUP BY category ORDER BY amount DESC`,
      [from, to]
    ),
    query<Expense>(
      `SELECT e.*, u.name AS unit_name FROM expenses e
         LEFT JOIN units u ON u.id = e.unit_id
        WHERE e.incurred_on >= $1::date AND e.incurred_on < $2::date
        ORDER BY e.incurred_on DESC, e.id DESC LIMIT 25`,
      [from, to]
    ),
    one<{ revenue: number }>(
      `SELECT COALESCE(SUM(b.total_amount), 0) AS revenue FROM bookings b
        WHERE b.starts_at >= $1 AND b.starts_at < $2 AND ${LIVE}`,
      [prevFrom, from]
    ),
  ]);

  const expenses = byCategory.reduce((s, r) => s + Number(r.amount), 0);

  return {
    monthStart: from,
    revenue: Number(totals?.revenue ?? 0),
    expenses,
    collected: Number(totals?.collected ?? 0),
    bookings: totals?.bookings ?? 0,
    hours: Number(totals?.hours ?? 0),
    prevRevenue: Number(prev?.revenue ?? 0),
    daily: daily.map((d) => ({ ...d, revenue: Number(d.revenue), expenses: Number(d.expenses) })),
    byUnit,
    byMethod,
    byCategory,
    recentExpenses,
  };
}

/* --------------------------------------------------------------- inbox --- */

export async function getContacts(): Promise<WaContact[]> {
  return query<WaContact>(
    `SELECT c.*,
       (SELECT m.body FROM wa_messages m WHERE m.contact_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS preview
     FROM wa_contacts c
     ORDER BY c.last_message_at DESC`
  );
}

export async function getThread(contactId: number): Promise<WaMessage[]> {
  return query<WaMessage>(
    `SELECT * FROM wa_messages WHERE contact_id = $1 ORDER BY created_at`,
    [contactId]
  );
}

export async function getContact(contactId: number): Promise<WaContact | null> {
  return one<WaContact>(`SELECT * FROM wa_contacts WHERE id = $1`, [contactId]);
}

/** Bookings tied to a phone number, so the inbox can show guest history. */
export async function getBookingsForPhone(phone: string): Promise<BookingWithUnit[]> {
  const digits = phone.replace(/\D/g, "").slice(-9);
  return query<BookingWithUnit>(
    `SELECT ${BOOKING_SELECT} FROM bookings b JOIN units u ON u.id = b.unit_id
      WHERE regexp_replace(b.guest_phone, '\\D', '', 'g') LIKE $1
      ORDER BY b.starts_at DESC LIMIT 10`,
    [`%${digits}`]
  );
}

/* ------------------------------------------------------------ settings --- */

export interface BusinessSettings {
  name: string;
  tagline: string;
  phone: string;
  currency: string;
  locale: string;
  checkinNote: string;
}

const DEFAULT_BUSINESS: BusinessSettings = {
  name: "Brandon Stays",
  tagline: "Hourly apartments",
  phone: "",
  currency: "IDR",
  locale: "en-ID",
  checkinNote: "",
};

export async function getBusiness(): Promise<BusinessSettings> {
  const row = await one<{ value: BusinessSettings }>(
    `SELECT value FROM app_settings WHERE key = 'business'`
  );
  return { ...DEFAULT_BUSINESS, ...(row?.value ?? {}) };
}

export type { Booking };
