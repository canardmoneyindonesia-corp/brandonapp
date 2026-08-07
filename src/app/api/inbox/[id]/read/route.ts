import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { handle, int, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = int((await params).id);
    await query(`UPDATE wa_contacts SET unread = 0 WHERE id = $1`, [id]);
    return ok({ id, unread: 0 });
  });
}
