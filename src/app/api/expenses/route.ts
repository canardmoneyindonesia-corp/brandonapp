import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handle, int, money, ok, str } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const sp = req.nextUrl.searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    return ok(
      await query(
        `SELECT e.*, u.name AS unit_name FROM expenses e
           LEFT JOIN units u ON u.id = e.unit_id
          ${from && to ? "WHERE e.incurred_on >= $1::date AND e.incurred_on < $2::date" : ""}
          ORDER BY e.incurred_on DESC, e.id DESC LIMIT 500`,
        from && to ? [from, to] : []
      )
    );
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const amount = money(body.amount);
    if (amount <= 0) return fail("Amount must be greater than zero");

    const category = EXPENSE_CATEGORIES.includes(str(body.category) as never) ? str(body.category) : "other";
    const rows = await query(
      `INSERT INTO expenses (unit_id, category, amount, incurred_on, note)
       VALUES ($1,$2,$3,COALESCE($4::date, current_date),$5) RETURNING *`,
      [body.unit_id ? int(body.unit_id) : null, category, amount, str(body.incurred_on) || null, str(body.note)]
    );
    return ok(rows[0], { status: 201 });
  });
}
