import { query } from "./db";
import type { WaMessage } from "./types";

/**
 * Records an inbound message, creating the contact on first contact. Shared by
 * the live Meta webhook and the demo "simulate incoming" button so both paths
 * produce identical rows.
 */
export async function recordIncoming({
  phone,
  name,
  body,
  waId,
  at,
}: {
  phone: string;
  name?: string;
  body: string;
  waId?: string | null;
  at?: Date;
}): Promise<WaMessage> {
  const normalized = phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;
  const when = at ?? new Date();

  const contacts = await query<{ id: number }>(
    `INSERT INTO wa_contacts (phone, name, avatar_hue, last_message_at, unread)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (phone) DO UPDATE
       SET last_message_at = GREATEST(wa_contacts.last_message_at, EXCLUDED.last_message_at),
           unread = wa_contacts.unread + 1,
           name = CASE WHEN wa_contacts.name = wa_contacts.phone
                       THEN COALESCE(NULLIF(EXCLUDED.name, ''), wa_contacts.name)
                       ELSE wa_contacts.name END
     RETURNING id`,
    [normalized, name || normalized, Math.abs(hashCode(normalized)) % 360, when]
  );

  const rows = await query<WaMessage>(
    `INSERT INTO wa_messages (contact_id, direction, body, status, wa_id, created_at)
     VALUES ($1, 'in', $2, 'delivered', $3, $4) RETURNING *`,
    [contacts[0].id, body, waId ?? null, when]
  );
  return rows[0];
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
