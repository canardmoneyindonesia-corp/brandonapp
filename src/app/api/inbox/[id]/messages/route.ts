import { NextRequest } from "next/server";
import { one, query } from "@/lib/db";
import { getThread } from "@/lib/queries";
import { fail, handle, int, ok, str } from "@/lib/api";
import { sendWhatsApp, whatsappMode } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => ok(await getThread(int((await params).id))));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const contactId = int((await params).id);
    const body = (await req.json()) as Record<string, unknown>;
    const text = str(body.body);
    if (!text) return fail("Message is empty");

    const contact = await one<{ phone: string }>(`SELECT phone FROM wa_contacts WHERE id = $1`, [contactId]);
    if (!contact) return fail("Conversation not found", 404);

    // In demo mode nothing leaves the machine — the message is still recorded so
    // the thread, unread counts and history behave exactly as they will live.
    const result = await sendWhatsApp(contact.phone, text);

    const rows = await query(
      `INSERT INTO wa_messages (contact_id, direction, body, status, wa_id)
       VALUES ($1, 'out', $2, $3, $4) RETURNING *`,
      [contactId, text, result.status, result.waId]
    );
    await query(`UPDATE wa_contacts SET last_message_at = now(), unread = 0 WHERE id = $1`, [contactId]);

    return ok({ message: rows[0], mode: whatsappMode(), delivery: result }, { status: 201 });
  });
}
