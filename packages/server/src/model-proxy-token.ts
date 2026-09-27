import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "./env.js";

export type ModelProxyClaims = { userId: string; sessionId: string; expiresAt: number };

export function createModelProxyToken(userId: string, sessionId: string, lifetimeMs: number) {
  const claims: ModelProxyClaims = { userId, sessionId, expiresAt: Date.now() + lifetimeMs };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", env.authSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyModelProxyToken(token: string): ModelProxyClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", env.authSecret).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64url"); }
  catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<ModelProxyClaims>;
    if (typeof claims.userId !== "string" || typeof claims.sessionId !== "string" || !Number.isSafeInteger(claims.expiresAt) || claims.expiresAt! <= Date.now()) return null;
    return claims as ModelProxyClaims;
  } catch {
    return null;
  }
}
