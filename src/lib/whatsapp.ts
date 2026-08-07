/**
 * WhatsApp transport.
 *
 * The inbox is fully built against the Meta WhatsApp Cloud API shape, but ships
 * in `demo` mode: outbound messages are stored and marked "sent" without leaving
 * the machine. To go live, set these in .env.local and restart:
 *
 *   WHATSAPP_MODE=live
 *   WHATSAPP_PHONE_NUMBER_ID=...      (Meta > WhatsApp > API setup)
 *   WHATSAPP_ACCESS_TOKEN=...         (permanent system-user token)
 *   WHATSAPP_VERIFY_TOKEN=...         (any string; paste the same one into Meta)
 *
 * then point the Meta webhook at  https://<your-host>/api/whatsapp/webhook
 */

export type WaMode = "demo" | "live";

export function whatsappMode(): WaMode {
  const configured =
    process.env.WHATSAPP_MODE === "live" &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !!process.env.WHATSAPP_ACCESS_TOKEN;
  return configured ? "live" : "demo";
}

export interface SendResult {
  status: "sent" | "failed";
  waId: string | null;
  mode: WaMode;
  error?: string;
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  const mode = whatsappMode();
  if (mode === "demo") {
    return { status: "sent", waId: null, mode };
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/[^\d]/g, ""),
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    const json = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { status: "failed", waId: null, mode, error: json.error?.message ?? `HTTP ${res.status}` };
    }
    return { status: "sent", waId: json.messages?.[0]?.id ?? null, mode };
  } catch (err) {
    return { status: "failed", waId: null, mode, error: (err as Error).message };
  }
}
