import "./env.js";
import { Pool } from "pg";

import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 24),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => console.error("[openmuse:db] idle client error", error));
