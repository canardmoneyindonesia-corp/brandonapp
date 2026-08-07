import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { query } from "@/lib/db";
import { fail, handle, int, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Set as cover, or rename the caption. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;

    const photo = (await query<{ unit_id: number }>(`SELECT unit_id FROM unit_photos WHERE id = $1`, [id]))[0];
    if (!photo) return fail("Photo not found", 404);

    if (body.is_cover === true) {
      await query(`UPDATE unit_photos SET is_cover = false WHERE unit_id = $1`, [photo.unit_id]);
      await query(`UPDATE unit_photos SET is_cover = true WHERE id = $1`, [id]);
    }
    if (typeof body.caption === "string") {
      await query(`UPDATE unit_photos SET caption = $1 WHERE id = $2`, [str(body.caption), id]);
    }
    if (body.sort_order !== undefined) {
      await query(`UPDATE unit_photos SET sort_order = $1 WHERE id = $2`, [int(body.sort_order), id]);
    }
    const rows = await query(`SELECT * FROM unit_photos WHERE id = $1`, [id]);
    return ok(rows[0]);
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const id = int((await params).id);
    const rows = await query<{ url: string; unit_id: number; is_cover: boolean }>(
      `DELETE FROM unit_photos WHERE id = $1 RETURNING url, unit_id, is_cover`,
      [id]
    );
    if (!rows.length) return fail("Photo not found", 404);
    const { url, unit_id, is_cover } = rows[0];

    // Only uploaded files live on disk — seeded /seed/* assets are shared.
    if (url.startsWith("/api/uploads/")) {
      const file = path.basename(url);
      await fs.rm(path.join(process.cwd(), "data", "uploads", file), { force: true });
    }
    if (is_cover) {
      await query(
        `UPDATE unit_photos SET is_cover = true WHERE id = (
           SELECT id FROM unit_photos WHERE unit_id = $1 ORDER BY sort_order LIMIT 1)`,
        [unit_id]
      );
    }
    return ok({ deleted: id });
  });
}
