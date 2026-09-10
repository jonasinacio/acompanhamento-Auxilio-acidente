import { Pool } from "pg";

// Pool único reaproveitado (evita esgotar conexões em dev/hot-reload).
const globalForPg = globalThis as unknown as { pgPool?: Pool };
export const pool =
  globalForPg.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export async function query(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows;
}
