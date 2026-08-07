import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handle, int, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = int((await params).id);
    const rows = await query(`DELETE FROM payments WHERE id = $1 RETURNING id`, [id]);
    return rows.length ? ok({ deleted: id }) : fail("Payment not found", 404);
  });
}
