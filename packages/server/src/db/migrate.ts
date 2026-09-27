import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../db.js";

const migrationsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../migrations");

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);

  const client = await pool.connect();
  let lockTaken = false;
  try {
    await client.query("SELECT pg_advisory_lock(72103941)");
    lockTaken = true;
    const files = (await readdir(migrationsDir)).filter((file) => /^\d+_[\w-]+\.sql$/u.test(file)).sort();
    for (const name of files) {
      const seen = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (seen.rowCount) continue;
      const sql = await readFile(resolve(migrationsDir, name), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [name]);
        await client.query("COMMIT");
        console.info(`[openmuse:db] applied ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (lockTaken) await client.query("SELECT pg_advisory_unlock(72103941)");
    client.release();
  }
} finally {
  await pool.end();
}
