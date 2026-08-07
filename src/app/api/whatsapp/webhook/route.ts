import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { recordIncoming } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/**
 * Meta WhatsApp Cloud API webhook.
 *
 * Verification (GET) is what Meta calls once when you save the callback URL.
 * Delivery (POST) carries inbound messages and status updates. Both are already
 * wired; nothing here runs until you point Meta at this URL.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge") ?? "";
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("Verification failed", { status: 403 });
}

interface WebhookPayload {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: {
          id: string;
          from: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }[];
        statuses?: { id: string; status?: string }[];
      };
    }[];
  }[];
}

export async function POST(req: NextRequest) {
  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};

        for (const msg of value.messages ?? []) {
          const profile = value.contacts?.find((c) => c.wa_id === msg.from);
          const body =
            msg.type === "text"
              ? (msg.text?.body ?? "")
              : `[${msg.type ?? "attachment"}] — open WhatsApp to view`;
          await recordIncoming({
            phone: msg.from,
            name: profile?.profile?.name,
            body,
            waId: msg.id,
            at: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : undefined,
          });
        }

        for (const st of value.statuses ?? []) {
          if (!st.status) continue;
          await query(`UPDATE wa_messages SET status = $1 WHERE wa_id = $2`, [st.status, st.id]);
        }
      }
    }
  } catch (err) {
    // Meta retries on non-200, which would replay the whole batch. Log and ack.
    console.error("WhatsApp webhook error:", err);
  }

  return NextResponse.json({ received: true });
}
