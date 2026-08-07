import { NextRequest } from "next/server";
import { one, query } from "@/lib/db";
import { quoteBooking } from "@/lib/pricing";
import { fail, handle, int, ok } from "@/lib/api";
import type { PricingRule, Unit } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Prices a prospective booking. The booking form calls this as the operator
 * types; POST /api/bookings re-runs the exact same function server-side, so the
 * quote shown and the quote charged can never drift apart.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const unitId = int(body.unit_id);
    const start = new Date(String(body.starts_at));
    const end = new Date(String(body.ends_at));
    const guests = Math.max(1, int(body.guests, 1));

    if (!unitId) return fail("unit_id is required");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fail("Invalid dates");

    const unit = await one<Unit>(`SELECT * FROM units WHERE id = $1`, [unitId]);
    if (!unit) return fail("Unit not found", 404);

    const rules = await query<PricingRule>(
      `SELECT * FROM pricing_rules WHERE active AND (unit_id IS NULL OR unit_id = $1) ORDER BY priority, id`,
      [unitId]
    );

    const quote = quoteBooking({ unit, rules, start, end, guests });

    const conflicts = await query<{ id: number; code: string; guest_name: string; starts_at: string; ends_at: string }>(
      `SELECT id, code, guest_name, starts_at, ends_at FROM bookings
        WHERE unit_id = $1 AND status NOT IN ('cancelled','no_show')
          AND starts_at < $3 AND ends_at > $2
          AND ($4::int IS NULL OR id <> $4)
        ORDER BY starts_at`,
      [unitId, start, end, body.exclude_id ? int(body.exclude_id) : null]
    );

    return ok({ ...quote, conflicts });
  });
}
