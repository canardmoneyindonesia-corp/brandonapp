import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handle, int, money, ok, str } from "@/lib/api";
import { PAYMENT_METHODS } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () =>
    ok(await query(`SELECT * FROM payments WHERE booking_id = $1 ORDER BY paid_at`, [int((await params).id)]))
  );
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const bookingId = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;
    const amount = money(body.amount);
    if (amount <= 0) return fail("Amount must be greater than zero");

    const method = PAYMENT_METHODS.includes(str(body.method) as never) ? str(body.method) : "cash";
    const paidAt = body.paid_at ? new Date(String(body.paid_at)) : new Date();
    if (Number.isNaN(paidAt.getTime())) return fail("Invalid payment date");

    const rows = await query(
      `INSERT INTO payments (booking_id, amount, method, paid_at, note) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [bookingId, amount, method, paidAt, str(body.note)]
    );
    return ok(rows[0], { status: 201 });
  });
}
