import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getPricingRules } from "@/lib/queries";
import { fail, handle, int, ok, str } from "@/lib/api";
import type { RuleKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: RuleKind[] = ["day_of_week", "time_of_day", "date_range", "duration", "fee"];

export async function GET() {
  return handle(async () => ok(await getPricingRules()));
}

/** Normalises the loose form payload into the shape the pricing engine reads. */
function buildParams(kind: RuleKind, body: Record<string, unknown>): Record<string, unknown> | string {
  const adjust = Number(body.adjust_pct);
  switch (kind) {
    case "day_of_week": {
      const days = Array.isArray(body.days) ? body.days.map((d) => int(d)).filter((d) => d >= 0 && d <= 6) : [];
      if (!days.length) return "Pick at least one day";
      if (!Number.isFinite(adjust) || adjust === 0) return "Adjustment percentage is required";
      return { days, adjust_pct: adjust };
    }
    case "time_of_day": {
      const from = int(body.from_hour, -1);
      const to = int(body.to_hour, -1);
      if (from < 0 || from > 23 || to < 0 || to > 24) return "Hours must be between 0 and 24";
      if (!Number.isFinite(adjust) || adjust === 0) return "Adjustment percentage is required";
      return { from_hour: from, to_hour: to, adjust_pct: adjust };
    }
    case "date_range": {
      const start = str(body.start);
      const end = str(body.end);
      if (!/^(\d{4}-)?\d{2}-\d{2}$/.test(start) || !/^(\d{4}-)?\d{2}-\d{2}$/.test(end))
        return "Dates must be MM-DD (yearly) or YYYY-MM-DD (one-off)";
      if (!Number.isFinite(adjust) || adjust === 0) return "Adjustment percentage is required";
      return { start, end, adjust_pct: adjust };
    }
    case "duration": {
      const minHours = int(body.min_hours, 0);
      if (minHours < 1) return "Minimum hours must be at least 1";
      if (!Number.isFinite(adjust) || adjust === 0) return "Adjustment percentage is required";
      return { min_hours: minHours, adjust_pct: adjust };
    }
    case "fee": {
      const amount = int(body.amount, 0);
      if (amount <= 0) return "Fee amount is required";
      return { amount, per: str(body.per) === "hour" ? "hour" : "booking" };
    }
  }
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const kind = str(body.kind) as RuleKind;
    if (!KINDS.includes(kind)) return fail("Unknown rule type");
    const name = str(body.name);
    if (!name) return fail("Give the rule a name");

    const params = buildParams(kind, body);
    if (typeof params === "string") return fail(params);

    const rows = await query(
      `INSERT INTO pricing_rules (unit_id, name, kind, params, priority, active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        body.unit_id ? int(body.unit_id) : null,
        name,
        kind,
        JSON.stringify(params),
        int(body.priority, 50),
        body.active !== false,
      ]
    );
    return ok(rows[0], { status: 201 });
  });
}
