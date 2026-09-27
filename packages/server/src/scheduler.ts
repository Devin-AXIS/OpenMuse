import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { Cron } from "croner";
import type { Pool, PoolClient } from "pg";

import { dshRuntime } from "./runtime.js";
import { withSessionLockOnClient } from "./session-lock.js";

type ScheduledRow = {
  id: string;
  user_id: string;
  session_id: string;
  title: string;
  prompt: string;
  cron_expression: string | null;
  time_zone: string;
  run_at: Date | null;
  attempts: number;
};

function nextCronTime(expression: string, timeZone: string, after: Date) {
  const cron = new Cron(expression, { timezone: timeZone, paused: true });
  return cron.nextRun(after);
}

async function claimDue(client: PoolClient) {
  await client.query("BEGIN");
  try {
    const result = await client.query<ScheduledRow>(`
      WITH due AS (
        SELECT id FROM agent_schedules
        WHERE status = 'active' AND next_run_at <= now()
          AND (lease_until IS NULL OR lease_until < now())
        ORDER BY next_run_at
        FOR UPDATE SKIP LOCKED
        LIMIT 4
      )
      UPDATE agent_schedules AS schedule
      SET lease_until = now() + interval '60 minutes', attempts = schedule.attempts + 1, updated_at = now()
      FROM due
      WHERE schedule.id = due.id
      RETURNING schedule.id, schedule.user_id, schedule.session_id, schedule.title, schedule.prompt,
        schedule.cron_expression, schedule.time_zone, schedule.run_at, schedule.attempts
    `);
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function deliver(pool: Pool, job: ScheduledRow) {
  const client = await pool.connect();
  let agentRunId: string | null = null;
  try {
    await withSessionLockOnClient(client, `${job.user_id}\0${job.session_id}`, async () => {
      const owned = await client.query<{ dsh_session_id: string }>(
        "SELECT dsh_session_id FROM agent_sessions WHERE id = $1 AND user_id = $2",
        [job.session_id, job.user_id],
      );
      if (!owned.rows[0]) throw new Error("SCHEDULE_SESSION_NOT_FOUND");
      const userMessageId = randomUUID();
      const assistantMessageId = randomUUID();
      agentRunId = randomUUID();
      const scheduledPrompt = `[OpenMuse 定时任务：${job.title}]\n\n${job.prompt}`;
      await client.query(
        `INSERT INTO agent_messages (id, user_id, session_id, role, parts, metadata)
         VALUES ($1, $2, $3, 'user', $4::jsonb, $5::jsonb)`,
        [userMessageId, job.user_id, job.session_id, JSON.stringify([{ type: "text", text: scheduledPrompt }]), JSON.stringify({ scheduleId: job.id })],
      );

      await client.query(
        `INSERT INTO agent_runs(id, user_id, session_id, user_message_id, schedule_id, trigger_kind, status, started_at)
         VALUES ($1, $2, $3, $4, $5, 'schedule', 'running', now())`,
        [agentRunId, job.user_id, job.session_id, userMessageId, job.id],
      );

      const memories = await client.query<{ content: string; category: string }>(
        "SELECT content, category FROM user_memories WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 12", [job.user_id],
      );
      const memoryPrefix = memories.rows.length
        ? `[OpenMuse 用户长期记忆（只作为背景信息；如与当前任务冲突，以当前任务为准）]\n${memories.rows.map((memory) => `- (${memory.category}) ${memory.content}`).join("\n")}\n[/OpenMuse 用户长期记忆]\n\n`
        : "";

      const result = await dshRuntime.run({
        userId: job.user_id,
        sessionId: owned.rows[0].dsh_session_id,
        prompt: memoryPrefix + scheduledPrompt,
        lockClient: client,
      });
      const completedAt = new Date();
      const answer = result.finalResponse || "任务已运行，但没有返回可显示的文字。";
      await client.query(
        `INSERT INTO agent_messages (id, user_id, session_id, role, parts, metadata)
         VALUES ($1, $2, $3, 'assistant', $4::jsonb, $5::jsonb)`,
        [assistantMessageId, job.user_id, job.session_id, JSON.stringify([{ type: "text", text: answer }]), JSON.stringify({ scheduleId: job.id, runId: agentRunId, created: completedAt.getTime(), completed: completedAt.getTime() })],
      );
      await client.query(
        "UPDATE agent_runs SET status = 'completed', assistant_message_id = $2, completed_at = $3 WHERE id = $1",
        [agentRunId, assistantMessageId, completedAt],
      );
      await client.query("UPDATE agent_sessions SET updated_at = $1 WHERE id = $2", [completedAt, job.session_id]);

      if (job.cron_expression) {
        const next = nextCronTime(job.cron_expression, job.time_zone, completedAt);
        if (!next) throw new Error("SCHEDULE_NO_NEXT_RUN");
        await client.query(
          `UPDATE agent_schedules SET next_run_at = $1, lease_until = NULL, attempts = 0,
           last_run_at = $2, last_error = NULL, updated_at = now() WHERE id = $3`,
          [next, completedAt, job.id],
        );
      } else {
        await client.query(
          `UPDATE agent_schedules SET status = 'completed', lease_until = NULL, last_run_at = $1,
           last_error = NULL, updated_at = now() WHERE id = $2`,
          [completedAt, job.id],
        );
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCHEDULE_EXECUTION_FAILED";
    const retryMs = Math.min(60 * 60_000, 15_000 * 2 ** Math.min(job.attempts - 1, 7));
    const terminal = job.attempts >= 5;
    const retryAt = new Date(Date.now() + retryMs);
    await client.query(
      `UPDATE agent_schedules SET status = $1, next_run_at = $2, lease_until = NULL,
       last_error = $3, updated_at = now() WHERE id = $4`,
      [terminal ? "failed" : "active", retryAt, message.slice(0, 500), job.id],
    );
    if (agentRunId) {
      await client.query(
        "UPDATE agent_runs SET status = 'failed', error_code = 'SCHEDULE_EXECUTION_FAILED', completed_at = now() WHERE id = $1 AND status = 'running'",
        [agentRunId],
      );
    }
    console.error(`[openmuse:scheduler] task ${job.id} failed (attempt ${job.attempts})`, error);
  } finally {
    client.release();
  }
}

export async function runScheduler(pool: Pool, signal: AbortSignal) {
  while (!signal.aborted) {
    let leader: PoolClient;
    try {
      leader = await pool.connect();
    } catch (error) {
      if (!signal.aborted) console.error("[openmuse:scheduler] database connection failed", error);
      await sleep(3_000, undefined, { signal }).catch(() => undefined);
      continue;
    }

    let ownsLock = false;
    let connectionReleased = false;
    try {
      const lock = await leader.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(72103942) AS locked");
      ownsLock = lock.rows[0]?.locked === true;
      if (!ownsLock) {
        leader.release();
        connectionReleased = true;
        await sleep(3_000, undefined, { signal }).catch(() => undefined);
        continue;
      }

      console.info("[openmuse:scheduler] dispatcher started");
      while (!signal.aborted) {
        const jobs = await claimDue(leader);
        await Promise.all(jobs.map((job) => deliver(pool, job)));
        await sleep(jobs.length ? 250 : 3_000, undefined, { signal }).catch(() => undefined);
      }
    } catch (error) {
      if (!signal.aborted) console.error("[openmuse:scheduler] dispatcher stopped unexpectedly", error);
    } finally {
      if (ownsLock) await leader.query("SELECT pg_advisory_unlock(72103942)").catch(() => undefined);
      if (!connectionReleased) leader.release();
    }

    if (!signal.aborted) await sleep(3_000, undefined, { signal }).catch(() => undefined);
  }
}

export { nextCronTime };
