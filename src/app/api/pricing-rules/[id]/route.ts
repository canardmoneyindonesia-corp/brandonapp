import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handle, int, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;

    const sets: string[] = [];
    const values: unknown[] = [];
    if (typeof body.active === "boolean") {
      values.push(body.active);
      sets.push(`active = $${values.length}`);
    }
    if (body.priority !== undefined) {
      values.push(int(body.priority));
      sets.push(`priority = $${values.length}`);
    }
    if (typeof body.name === "string") {
      values.push(body.name.trim());
      sets.push(`name = $${values.length}`);
    }
    if (!sets.length) return fail("Nothing to update");

    values.push(id);
    const rows = await query(
      `UPDATE pricing_rules SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows.length ? ok(rows[0]) : fail("Rule not found", 404);
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const rows = await query(`DELETE FROM pricing_rules WHERE id = $1 RETURNING id`, [id]);
    return rows.length ? ok({ deleted: id }) : fail("Rule not found", 404);
  });
}
