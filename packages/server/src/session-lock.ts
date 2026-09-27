import type { Pool, PoolClient } from "pg";

export function userWorkspaceLockKey(userId: string) {
  return `openmuse-e2b-workspace\0${userId}`;
}

/** Serialize runs for one account/session across every API replica. */
export async function withSessionLock<T>(pool: Pool, key: string, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await withSessionLockOnClient(client, key, () => operation(client));
  } finally {
    client.release();
  }
}

export async function withSessionLockOnClient<T>(client: PoolClient, key: string, operation: () => Promise<T>): Promise<T> {
  let acquired = false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtextextended($1, 8675309))", [key]);
    acquired = true;
    return await operation();
  } finally {
    if (acquired) await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 8675309))", [key]).catch(() => undefined);
  }
}
