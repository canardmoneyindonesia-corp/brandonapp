import pg, { Pool, type QueryResultRow } from "pg";

// pg hands back bigint and numeric as strings to protect precision. Every such
// column here is money in whole rupiah or a small hour count, all far inside
// Number.MAX_SAFE_INTEGER, so parse them once here instead of at 200 call sites.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8 / bigint
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v))); // numeric
// DATE stays a plain 'YYYY-MM-DD' string. Parsing it into a Date would apply the
// server's timezone and silently shift calendar days for +07:00.
pg.types.setTypeParser(1082, (v) => v);

// Next's dev server re-evaluates modules on every hot reload; without this the
// process would leak a new pool per edit until Postgres refuses connections.
const globalForPg = globalThis as unknown as { __pgPool?: Pool };

export const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") globalForPg.__pgPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a transaction, rolling back on any throw. */
export async function tx<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
