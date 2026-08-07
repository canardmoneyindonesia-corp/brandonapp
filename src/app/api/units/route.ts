import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getUnits } from "@/lib/queries";
import { fail, handle, int, money, ok, requireFields, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(await getUnits()));
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const missing = requireFields(body, ["name", "base_rate"]);
    if (missing) return fail(missing);

    const rows = await query(
      `INSERT INTO units (name, code, type, building, address, floor, capacity, bedrooms, bathrooms,
                          amenities, description, base_rate, min_hours, cleaning_fee, extra_guest_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        str(body.name),
        str(body.code) || null,
        str(body.type, "Studio"),
        str(body.building),
        str(body.address),
        str(body.floor),
        Math.max(1, int(body.capacity, 2)),
        Math.max(0, int(body.bedrooms, 1)),
        Math.max(0, int(body.bathrooms, 1)),
        Array.isArray(body.amenities) ? body.amenities.map(String) : [],
        str(body.description),
        money(body.base_rate),
        Math.max(1, int(body.min_hours, 3)),
        money(body.cleaning_fee),
        money(body.extra_guest_fee),
        ["active", "maintenance", "inactive"].includes(str(body.status)) ? str(body.status) : "active",
      ]
    );
    return ok(rows[0], { status: 201 });
  });
}
