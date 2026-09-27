import { createHash } from "node:crypto";
import { Volume } from "e2b";

import { pool } from "./db.js";
import { env } from "./env.js";
import { withSessionLock, withSessionLockOnClient } from "./session-lock.js";
import type { PoolClient } from "pg";

const connected = new Map<string, Volume>();

function volumeApiOptions() {
  return { token: env.e2bApiKey, apiUrl: env.e2bVolumeApiUrl };
}

function userVolumeName(userId: string) {
  return `openmuse-${createHash("sha256").update(userId).digest("hex").slice(0, 40)}`;
}

export async function userVolume(userId: string, lockClient?: PoolClient) {
  if (env.sandboxProvider !== "e2b") throw new Error("E2B_VOLUME_UNAVAILABLE");
  const cached = connected.get(userId);
  if (cached) return cached;

  const resolveVolume = async (client: PoolClient) => {
    const again = connected.get(userId);
    if (again) return again;
    const result = await client.query<{ e2b_volume_id: string }>(
      "SELECT e2b_volume_id FROM user_runtime_resources WHERE user_id = $1", [userId],
    );
    let volume: Volume;
    if (result.rows[0]) {
      volume = await Volume.connect(result.rows[0].e2b_volume_id, volumeApiOptions());
    } else {
      volume = await Volume.create(userVolumeName(userId), volumeApiOptions());
      await client.query(
        `INSERT INTO user_runtime_resources(user_id, e2b_volume_id)
         VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`, [userId, volume.volumeId],
      );
      const saved = await client.query<{ e2b_volume_id: string }>(
        "SELECT e2b_volume_id FROM user_runtime_resources WHERE user_id = $1", [userId],
      );
      if (saved.rows[0]?.e2b_volume_id !== volume.volumeId) {
        await Volume.destroy(volume.volumeId, volumeApiOptions()).catch(() => undefined);
        volume = await Volume.connect(saved.rows[0]!.e2b_volume_id, volumeApiOptions());
      }
    }
    await Promise.all(["/workspace", "/dsh-home", "/browser-profile"].map((path) => volume.makeDir(path, { mode: 0o700, uid: 1000, gid: 1000, force: true })));
    connected.set(userId, volume);
    return volume;
  };
  const lockKey = `openmuse-volume\0${userId}`;
  return lockClient
    ? withSessionLockOnClient(lockClient, lockKey, () => resolveVolume(lockClient))
    : withSessionLock(pool, lockKey, resolveVolume);
}

export async function removeUserVolumeCache(userId: string) {
  connected.delete(userId);
}
