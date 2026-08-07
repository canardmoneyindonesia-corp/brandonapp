import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getBusiness } from "@/lib/queries";
import { handle, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(await getBusiness()));
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const current = await getBusiness();
    const next = {
      ...current,
      name: str(body.name, current.name) || current.name,
      tagline: str(body.tagline, current.tagline),
      phone: str(body.phone, current.phone),
      checkinNote: str(body.checkinNote, current.checkinNote),
    };
    await query(
      `INSERT INTO app_settings (key, value) VALUES ('business', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(next)]
    );
    return ok(next);
  });
}
