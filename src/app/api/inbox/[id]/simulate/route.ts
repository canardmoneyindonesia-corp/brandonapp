import { NextRequest } from "next/server";
import { one } from "@/lib/db";
import { recordIncoming } from "@/lib/inbox";
import { fail, handle, int, ok, str } from "@/lib/api";

export const dynamic = "force-dynamic";

const SAMPLES = [
  "Halo kak, masih available hari ini?",
  "Bisa extend 1 jam lagi nggak?",
  "Sudah transfer ya kak, tolong dicek 🙏",
  "Alamat lengkapnya di mana ya?",
  "Boleh minta foto kamarnya?",
  "Kalau 6 jam dapat diskon nggak?",
];

/**
 * Demo-mode helper: pushes a message into the thread exactly as the Meta webhook
 * would, so the inbox can be exercised end to end before any account exists.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = int((await params).id);
    const contact = await one<{ phone: string; name: string }>(
      `SELECT phone, name FROM wa_contacts WHERE id = $1`,
      [id]
    );
    if (!contact) return fail("Conversation not found", 404);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const text = str(body.body) || SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

    const message = await recordIncoming({
      phone: contact.phone,
      name: contact.name,
      body: text,
    });
    return ok(message, { status: 201 });
  });
}
