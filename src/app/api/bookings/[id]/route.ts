import { NextRequest } from "next/server";
import { one, query } from "@/lib/db";
import { quoteBooking } from "@/lib/pricing";
import { fail, handle, int, money, ok, str } from "@/lib/api";
import { BOOKING_STATUSES, type Booking, type PricingRule, type Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;

    const booking = await one<Booking>(`SELECT * FROM bookings WHERE id = $1`, [id]);
    if (!booking) return fail("Booking not found", 404);

    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (col: string, value: unknown) => {
      values.push(value);
      sets.push(`${col} = $${values.length}`);
    };

    if (typeof body.status === "string") {
      if (!BOOKING_STATUSES.includes(body.status as never)) return fail("Unknown status");
      set("status", body.status);
    }
    if (typeof body.guest_name === "string") set("guest_name", str(body.guest_name));
    if (typeof body.guest_phone === "string") set("guest_phone", str(body.guest_phone));
    if (typeof body.notes === "string") set("notes", str(body.notes));
    if (body.guests !== undefined) set("guests", Math.max(1, int(body.guests, 1)));

    // Rescheduling re-prices the stay from scratch.
    const rescheduling = body.starts_at !== undefined || body.ends_at !== undefined || body.unit_id !== undefined;
    if (rescheduling) {
      const unitId = body.unit_id !== undefined ? int(body.unit_id) : booking.unit_id;
      const start = new Date(String(body.starts_at ?? booking.starts_at));
      const end = new Date(String(body.ends_at ?? booking.ends_at));
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail("Invalid dates");
      if (end <= start) return fail("Check-out must be after check-in");

      const unit = await one<Unit>(`SELECT * FROM units WHERE id = $1`, [unitId]);
      if (!unit) return fail("Unit not found", 404);
      const rules = await query<PricingRule>(
        `SELECT * FROM pricing_rules WHERE active AND (unit_id IS NULL OR unit_id = $1) ORDER BY priority, id`,
        [unitId]
      );
      const guests = body.guests !== undefined ? Math.max(1, int(body.guests, 1)) : booking.guests;
      const q = quoteBooking({ unit, rules, start, end, guests });

      set("unit_id", unitId);
      set("starts_at", start);
      set("ends_at", end);
      set("hours", q.hours);
      set("base_amount", q.baseAmount);
      set("fees_amount", q.feesAmount);
      set("discount_amount", q.discountAmount);
      set("total_amount", q.total);
      set("breakdown", JSON.stringify(q.lines));
    }

    if (body.override_total !== undefined && body.override_total !== null && body.override_total !== "") {
      set("total_amount", money(body.override_total));
    }

    if (!sets.length) return fail("Nothing to update");
    values.push(id);
    const rows = await query(`UPDATE bookings SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values);
    return ok(rows[0]);
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const rows = await query(`DELETE FROM bookings WHERE id = $1 RETURNING id`, [id]);
    return rows.length ? ok({ deleted: id }) : fail("Booking not found", 404);
  });
}
