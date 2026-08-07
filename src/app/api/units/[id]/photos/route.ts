import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { query } from "@/lib/db";
import { fail, handle, int, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const unitId = int((await params).id);
    const form = await req.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (!files.length) return fail("No files uploaded");

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const existing = await query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM unit_photos WHERE unit_id = $1`,
      [unitId]
    );
    const had = existing[0]?.n ?? 0;
    let sort = had;

    const created = [];
    for (const file of files) {
      const ext = ALLOWED[file.type];
      if (!ext) return fail(`Unsupported file type: ${file.type || "unknown"}`, 415);
      if (file.size > MAX_BYTES) return fail(`"${file.name}" is larger than 12 MB`, 413);

      const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

      const rows = await query(
        `INSERT INTO unit_photos (unit_id, url, caption, sort_order, is_cover)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          unitId,
          `/api/uploads/${name}`,
          str(form.get("caption")),
          sort++,
          had === 0 && sort === 1, // first photo of a fresh unit becomes the cover
        ]
      );
      created.push(rows[0]);
    }
    return ok(created, { status: 201 });
  });
}
