import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Photo storage with two backends, chosen by environment rather than by config:
 *
 *   Vercel  → @vercel/blob. Serverless filesystems are read-only outside /tmp,
 *             and /tmp is per-instance and wiped between invocations, so an
 *             uploaded file has to leave the function to survive.
 *   Local   → data/uploads/, served back through /api/uploads/<file>.
 *
 * The switch is the presence of BLOB_READ_WRITE_TOKEN, which Vercel injects
 * automatically once a Blob store is attached to the project. Set it in
 * .env.local too if you want to exercise the production path while developing.
 */

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export const usingBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_BYTES = 12 * 1024 * 1024;

export function extensionFor(mime: string): string | null {
  return ALLOWED[mime] ?? null;
}

/** Persists one uploaded file and returns the URL to store on the photo row. */
export async function saveUpload(file: File, ext: string): Promise<string> {
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (usingBlob()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`units/${name}`, bytes, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);
  return `/api/uploads/${name}`;
}

/**
 * Removes the backing file for a photo URL. Seeded `/seed/*.png` assets are
 * shared build artefacts and are deliberately left alone.
 */
export async function deleteUpload(url: string): Promise<void> {
  if (url.startsWith("/api/uploads/")) {
    await fs.rm(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
    return;
  }
  if (/^https?:\/\/[^/]*\.blob\.vercel-storage\.com\//.test(url) && usingBlob()) {
    const { del } = await import("@vercel/blob");
    // A dead blob is a cosmetic leak, not a failed delete — never block the row
    // removal the operator actually asked for.
    await del(url).catch(() => {});
  }
}
