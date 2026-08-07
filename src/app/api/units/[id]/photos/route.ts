import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { fail, handle, int, ok, str } from "@/lib/api";
import { MAX_BYTES, extensionFor, saveUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const unitId = int((await params).id);
    const form = await req.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (!files.length) return fail("No files uploaded");

    const existing = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM unit_photos WHERE unit_id = $1`,
      [unitId]
    );
    const had = existing[0]?.n ?? 0;
    let sort = had;

    const created = [];
    for (const file of files) {
      const ext = extensionFor(file.type);
      if (!ext) return fail(`Unsupported file type: ${file.type || "unknown"}`, 415);
      if (file.size > MAX_BYTES) return fail(`"${file.name}" is larger than 12 MB`, 413);

      const url = await saveUpload(file, ext);

      const rows = await query(
        `INSERT INTO unit_photos (unit_id, url, caption, sort_order, is_cover)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [unitId, url, str(form.get("caption")), sort++, had === 0 && sort === 1]
      );
      created.push(rows[0]);
    }
    return ok(created, { status: 201 });
  });
}
