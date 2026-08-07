import { NextResponse } from "next/server";

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, init);

export const fail = (message: string, status = 400, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, ...extra }, { status });

/** Wraps a handler so Postgres constraint violations become useful messages. */
export async function handle<T>(fn: () => Promise<T>): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    const e = err as { code?: string; message?: string; constraint?: string; detail?: string };
    if (e.code === "23P01" && e.constraint === "bookings_no_overlap") {
      return fail("That unit is already booked for part of this time slot.", 409);
    }
    if (e.code === "23505") return fail("That value is already taken.", 409, { detail: e.detail });
    if (e.code === "23503") return fail("Referenced record does not exist.", 400);
    if (e.code === "23514") return fail("Check-out must be after check-in.", 400);
    if (e.code === "3D000" || e.code === "42P01") {
      return fail("Database is not set up yet. Run: npm run db:reset", 503);
    }
    if (e.code === "ECONNREFUSED" || e.code === "28P01") {
      return fail("Cannot reach PostgreSQL. Check DATABASE_URL in .env.local.", 503);
    }
    console.error(err);
    return fail(e.message ?? "Unexpected error", 500);
  }
}

export const int = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

export const money = (v: unknown): number => Math.max(0, Math.round(Number(v) || 0));

export const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : fallback;

export function requireFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    const v = body[f];
    if (v === undefined || v === null || v === "") return `Missing required field: ${f}`;
  }
  return null;
}
