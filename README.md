# OpenMuse

Open-source, mobile-first personal assistant. The app uses DeepSeek Harness (DSH) for agent execution and supports two server runtime modes: a local development process and an isolated E2B microVM for each cloud run.

## Local development

Requirements: Node.js 24+, pnpm 10+, and Docker for local PostgreSQL.

```sh
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm --filter @openmuse/server db:migrate
```

Run the API and web app in separate terminals:

```sh
pnpm dev:server
pnpm dev
```

The web app is at `http://localhost:3102`; the API is at `http://localhost:3100`. Development phone OTP codes are printed in the API terminal. Set `DEEPSEEK_API_KEY` in `.env` to enable local DSH responses.

## Backend services

- Better Auth phone sign-in and account sessions.
- PostgreSQL persistence for conversations, messages, activity, memories, goals, schedules, and per-user runtime resource IDs.
- User workspace APIs for files, Skills, and private attachments.
- Durable one-shot and cron schedules, claimed with PostgreSQL leases and executed by the server scheduler.
- A DSH runtime adapter with local development and E2B cloud providers.
- A model-proxy endpoint that keeps the DeepSeek platform key on the API server, gives each sandbox a short-lived user/session token, and enforces per-user daily request and byte quotas.

## E2B cloud runtime

Production requires `OPENMUSE_SANDBOX_PROVIDER=e2b`. Each chat or scheduled task starts an E2B sandbox from the OpenMuse DSH template, mounts the user's persistent E2B volume, runs one DSH invocation, and kills the sandbox when that invocation ends. The persistent volume holds the user's workspace, Skills, and DSH session homes; PostgreSQL holds application records and the volume ID. This avoids an always-running VM per user while preserving agent files between runs.

The OpenMuse API, PostgreSQL, and E2B Runtime are separate services. To self-host the E2B Runtime, use a Linux host with KVM and follow the [E2B Runtime embed guide](https://github.com/e2b-dev/runtime/tree/main/embed) and its [local development requirements](https://github.com/e2b-dev/runtime/blob/main/DEV-LOCAL.md). Configure these production variables in the API service:

```env
NODE_ENV=production
OPENMUSE_SANDBOX_PROVIDER=e2b
BETTER_AUTH_URL=https://api.example.com
OPENMUSE_WEB_ORIGINS=https://app.example.com
OPENMUSE_SMS_WEBHOOK_URL=https://sms.example.com/send
DATABASE_URL=postgres://...
DATABASE_POOL_SIZE=24
BETTER_AUTH_SECRET=<unique random value, at least 32 characters>
DEEPSEEK_API_KEY=<server-side provider key>
OPENMUSE_E2B_API_KEY=<E2B Runtime API key>
OPENMUSE_E2B_API_URL=https://<runtime-api-endpoint>
OPENMUSE_E2B_SANDBOX_URL=https://<sandbox-endpoint>
OPENMUSE_E2B_VOLUME_API_URL=https://<volume-api-endpoint>
OPENMUSE_E2B_TEMPLATE=openmuse-dsh
```

Build and publish the DSH sandbox template from this repository with `pnpm build:sandbox` in an environment that can reach the configured E2B Runtime build service. Then run `pnpm --filter @openmuse/server db:migrate`, build the API with `pnpm build:server`, and start it with `pnpm --filter @openmuse/server start`. Keep PostgreSQL durable and backed up. The user files and DSH logs are stored in E2B volumes and need a separate backup/retention policy on the E2B deployment.

The model proxy defaults to 400 requests and 100 MiB of request bodies per account per UTC day; adjust `OPENMUSE_LLM_DAILY_REQUESTS` and `OPENMUSE_LLM_DAILY_BYTES` for the service's cost and abuse limits. Sandbox internet access is currently enabled for agent tools; set network-egress restrictions in the E2B Runtime deployment before exposing this service to public users.

## Local runtime boundary and current limitations

`OPENMUSE_SANDBOX_PROVIDER=local` is for trusted local development only. It runs DSH as a child process on the API host and is not a public multi-tenant isolation boundary. Production configuration rejects local mode and requires E2B.

The cloud template enables Chromium through DSH's experimental Playwright MCP provider. Browser cookies and profile data are stored in the user's persistent E2B volume; open tabs are recreated for each run. The mobile app does not yet expose a live browser view or PC QR pairing: selecting `iPolloWork PC` returns `PC_RUNTIME_NOT_CONNECTED`. Scheduled jobs run only while the API scheduler service is available; PostgreSQL leases allow another API replica to take over after a failure. Push notifications are not configured.

## API surface

All `/api/v1/*` routes require a Better Auth session. `/api/health` is the database-aware liveness endpoint.

- `/api/v1/sessions` and `/api/v1/sessions/:id/messages`: conversations and DSH-backed SSE runs.
- `/api/v1/me/memories`: user-owned long-term memory CRUD.
- `/api/v1/goals`: user-owned goal CRUD.
- `/api/v1/activity`: chat and scheduled-run history.
- `/api/v1/schedules`: one-shot and cron schedules, pause/resume/delete.
- `/api/v1/workspace/*`: file listing, read/write/delete, and private attachment delivery.
