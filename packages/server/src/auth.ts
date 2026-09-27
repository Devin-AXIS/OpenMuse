import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";

import { pool } from "./db.js";
import { env } from "./env.js";

async function deliverOtp(phoneNumber: string, code: string) {
  if (env.smsWebhookUrl) {
    const response = await fetch(env.smsWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.smsWebhookToken ? { Authorization: `Bearer ${env.smsWebhookToken}` } : {}),
      },
      body: JSON.stringify({ phoneNumber, code, expiresInSeconds: 300 }),
    });
    if (!response.ok) throw new Error(`SMS webhook returned ${response.status}.`);
    return;
  }

  if (env.isProduction) throw new Error("Configure OPENMUSE_SMS_WEBHOOK_URL before enabling phone sign-in in production.");
  console.info(`[openmuse:auth] development OTP for ${phoneNumber}: ${code}`);
}

export const auth = betterAuth({
  database: pool,
  baseURL: env.authUrl,
  secret: env.authSecret,
  trustedOrigins: env.webOrigins,
  advanced: {
    useSecureCookies: env.isProduction,
    defaultCookieAttributes: { sameSite: env.isProduction ? "none" : "lax", secure: env.isProduction },
  },
  plugins: [phoneNumber({
    sendOTP: ({ phoneNumber: phone, code }) => deliverOtp(phone, code),
    signUpOnVerification: {
      getTempEmail: (phone) => `${createHash("sha256").update(phone).digest("hex")}@users.openmuse.local`,
      getTempName: () => "OpenMuse User",
    },
  })],
});
