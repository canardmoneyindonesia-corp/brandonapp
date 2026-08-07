import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getUnit } from "@/lib/queries";
import { fail, handle, int, money, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const unit = await getUnit(int((await params).id));
    return unit ? ok(unit) : fail("Unit not found", 404);
  });
}

const COLUMNS: Record<string, (v: unknown) => unknown> = {
  name: (v) => str(v),
  code: (v) => str(v) || null,
  type: (v) => str(v),
  building: (v) => str(v),
  address: (v) => str(v),
  floor: (v) => str(v),
  capacity: (v) => Math.max(1, int(v, 1)),
  bedrooms: (v) => Math.max(0, int(v)),
  bathrooms: (v) => Math.max(0, int(v)),
  amenities: (v) => (Array.isArray(v) ? v.map(String) : []),
  description: (v) => str(v),
  base_rate: money,
  min_hours: (v) => Math.max(1, int(v, 1)),
  cleaning_fee: money,
  extra_guest_fee: money,
  status: (v) => (["active", "maintenance", "inactive"].includes(str(v)) ? str(v) : "active"),
};

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, coerce] of Object.entries(COLUMNS)) {
      if (!(key in body)) continue;
      values.push(coerce(body[key]));
      sets.push(`${key} = $${values.length}`);
    }
    if (!sets.length) return fail("Nothing to update");

    values.push(id);
    const rows = await query(`UPDATE units SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`, values);
    return rows.length ? ok(rows[0]) : fail("Unit not found", 404);
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const rows = await query(`DELETE FROM units WHERE id = $1 RETURNING id`, [id]);
    return rows.length ? ok({ deleted: id }) : fail("Unit not found", 404);
  });
}
