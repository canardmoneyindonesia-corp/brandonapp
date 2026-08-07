import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { getContacts } from "@/lib/queries";
import { fail, handle, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(await getContacts()));
}

/** Start a new conversation from a phone number. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json()) as Record<string, unknown>;
    const phone = str(body.phone).replace(/[^\d+]/g, "");
    if (phone.length < 8) return fail("Enter a valid phone number");

    const rows = await query(
      `INSERT INTO wa_contacts (phone, name, avatar_hue, last_message_at, unread)
       VALUES ($1, $2, $3, now(), 0)
       ON CONFLICT (phone) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), wa_contacts.name)
       RETURNING *`,
      [phone, str(body.name) || phone, Math.floor(Math.random() * 360)]
    );
    return ok(rows[0], { status: 201 });
  });
}
