"use client";

import { createAuthClient } from "better-auth/react";
import { phoneNumberClient } from "better-auth/client/plugins";

import { cloudBaseUrl } from "./config";

export const authClient = createAuthClient({ baseURL: cloudBaseUrl, plugins: [phoneNumberClient()] });
