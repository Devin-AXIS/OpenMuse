import { Template, defaultBuildLogger } from "e2b";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { env } from "./env.js";

const serverRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sandboxDirectory = resolve(serverRoot, "sandbox");
const template = Template({ fileContextPath: sandboxDirectory }).fromDockerfile("Dockerfile");
const result = await Template.build(template, env.e2bTemplate, {
  ...env.e2bApiOptions,
  cpuCount: 2,
  memoryMB: 4096,
  onBuildLogs: defaultBuildLogger(),
});
console.info(`[openmuse:e2b] built template ${result.templateId}`);
