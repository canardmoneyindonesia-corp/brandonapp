import { NextRequest } from "next/server";
import { one, query, tx } from "@/lib/db";
import { getBookings } from "@/lib/queries";
import { quoteBooking } from "@/lib/pricing";
import { fail, handle, int, money, ok, requireFields, str } from "@/lib/api";
import { BOOKING_SOURCES, BOOKING_STATUSES, type PricingRule, type Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    return ok(
      await getBookings({
        from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
        to: sp.get("to") ? new Date(sp.get("to")!) : undefined,
        unitId: sp.get("unit_id") ? int(sp.get("unit_id")) : undefined,
        status: sp.get("status") ?? undefined,
        search: sp.get("q") ?? undefined,
        limit: sp.get("limit") ? int(sp.get("limit")) : undefined,
      })
    );
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const missing = requireFields(body, ["unit_id", "guest_name", "starts_at", "ends_at"]);
    if (missing) return fail(missing);

    const unitId = int(body.unit_id);
    const start = new Date(String(body.starts_at));
    const end = new Date(String(body.ends_at));
    const guests = Math.max(1, int(body.guests, 1));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail("Invalid dates");
    if (end <= start) return fail("Check-out must be after check-in");

    const unit = await one<Unit>(`SELECT * FROM units WHERE id = $1`, [unitId]);
    if (!unit) return fail("Unit not found", 404);

    const rules = await query<PricingRule>(
      `SELECT * FROM pricing_rules WHERE active AND (unit_id IS NULL OR unit_id = $1) ORDER BY priority, id`,
      [unitId]
    );

    // Always price on the server. A manual override is allowed but must be
    // explicit, so an accidental client value can't silently set the total.
    const quote = quoteBooking({ unit, rules, start, end, guests });
    const total = body.override_total !== undefined && body.override_total !== null && body.override_total !== ""
      ? money(body.override_total)
      : quote.total;

    const status = BOOKING_STATUSES.includes(str(body.status) as never) ? str(body.status) : "confirmed";
    const source = BOOKING_SOURCES.includes(str(body.source) as never) ? str(body.source) : "whatsapp";

    return tx(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO bookings (unit_id, guest_name, guest_phone, guests, starts_at, ends_at, hours,
                               base_amount, fees_amount, discount_amount, total_amount, breakdown, status, source, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          unitId,
          str(body.guest_name),
          str(body.guest_phone),
          guests,
          start,
          end,
          quote.hours,
          quote.baseAmount,
          quote.feesAmount,
          quote.discountAmount,
          total,
          JSON.stringify(quote.lines),
          status,
          source,
          str(body.notes),
        ]
      );
      const booking = rows[0];

      const deposit = money(body.deposit_amount);
      if (deposit > 0) {
        await client.query(
          `INSERT INTO payments (booking_id, amount, method, note) VALUES ($1,$2,$3,$4)`,
          [booking.id, deposit, str(body.deposit_method, "cash"), "Recorded at booking"]
        );
      }
      return ok(booking, { status: 201 });
    });
  });
}
