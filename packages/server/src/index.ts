import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./auth.js";
import { env } from "./env.js";
import { pool } from "./db.js";
import { createRoutes } from "./routes.js";
import { runScheduler } from "./scheduler.js";
import { dshRuntime } from "./runtime.js";

const app = new Hono();
const webOrigins = new Set(env.webOrigins);

app.use("/api/*", cors({
  origin: (origin) => origin && webOrigins.has(origin) ? origin : null,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  maxAge: 600,
}));
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/", createRoutes(pool));
app.onError((error, c) => {
  console.error("[openmuse:http] unhandled request error", error);
  return c.json({ error: "INTERNAL_ERROR", message: "The OpenMuse service could not complete this request." }, 500);
});

const server = serve({ fetch: app.fetch, port: env.port, hostname: process.env.OPENMUSE_SERVER_HOST ?? "0.0.0.0" }, (info) => {
  console.info(`[openmuse:server] listening on http://${info.address}:${info.port}`);
});
const schedulerAbort = new AbortController();
void runScheduler(pool, schedulerAbort.signal);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[openmuse:server] received ${signal}; shutting down`);
  schedulerAbort.abort();
  await dshRuntime.closeAll();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
}

process.once("SIGINT", () => { void shutdown("SIGINT"); });
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
