import type { ChatMessage } from "@ipollowork/chat-client";

import { basename, classifyTool, type ChatToolPart } from "./tool-display";

export type ChatArtifactType = "html" | "code" | "document" | "sheet" | "slides" | "image" | "pdf" | "file";
export type ChatArtifactStatus = "pending" | "running" | "completed";

export type ChatArtifact = {
  id: string;
  partId: string;
  path: string;
  name: string;
  type: ChatArtifactType;
  version: number;
  status: ChatArtifactStatus;
};

const PATH_KEYS = new Set(["path", "file", "filepath", "file_path", "filename", "target", "target_file"]);
const CODE_EXTENSIONS = new Set([
  "c", "cc", "cpp", "cs", "css", "dart", "go", "graphql", "java", "js", "jsx", "json", "kt", "kts",
  "lua", "php", "prisma", "py", "rb", "rs", "scss", "sh", "sql", "svelte", "swift", "toml", "ts", "tsx",
  "vue", "xml", "yaml", "yml",
]);

function normalizePath(value: string): string | null {
  const clean = value.trim().replace(/^["'`]+|["'`,;:]+$/gu, "").replace(/\\/gu, "/");
  if (!clean || clean.endsWith("/") || /^(?:https?|data):/iu.test(clean) || clean.includes("\n")) return null;
  return clean.replace(/^\.\//u, "");
}

function collectPatchPaths(value: string, output: Set<string>) {
  for (const match of value.matchAll(/^\*\*\*\s+(?:Add|Update|Delete) File:\s*(.+)$/gimu)) {
    const path = normalizePath(match[1] ?? "");
    if (path) output.add(path);
  }
  for (const match of value.matchAll(/^\*\*\*\s+Move to:\s*(.+)$/gimu)) {
    const path = normalizePath(match[1] ?? "");
    if (path) output.add(path);
  }
}

function collectPaths(value: unknown, output: Set<string>, parentKey = "", depth = 0): void {
  if (depth > 8 || value == null) return;
  if (typeof value === "string") {
    if (PATH_KEYS.has(parentKey.toLowerCase())) {
      const path = normalizePath(value);
      if (path) output.add(path);
    }
    collectPatchPaths(value, output);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, output, parentKey, depth + 1);
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) collectPaths(child, output, key, depth + 1);
}

export function artifactPaths(entry: ChatToolPart): string[] {
  const kind = classifyTool(entry.tool);
  if (kind !== "write" && kind !== "edit") return [];
  const paths = new Set<string>();
  collectPaths(entry.state.input, paths);
  if ("metadata" in entry.state) collectPaths(entry.state.metadata, paths);
  return [...paths];
}

export function classifyArtifact(path: string): ChatArtifactType {
  const extension = basename(path).split(".").pop()?.toLowerCase() ?? "";
  if (extension === "html" || extension === "htm") return "html";
  if (["md", "markdown", "txt", "rtf", "doc", "docx"].includes(extension)) return "document";
  if (["csv", "xls", "xlsx", "ods"].includes(extension)) return "sheet";
  if (["ppt", "pptx", "key"].includes(extension)) return "slides";
  if (["avif", "gif", "jpeg", "jpg", "png", "svg", "webp"].includes(extension)) return "image";
  if (extension === "pdf") return "pdf";
  return CODE_EXTENSIONS.has(extension) ? "code" : "file";
}

/** Returns only the newest card for each file; cards stay next to the tool part that produced that revision. */
export function deriveLatestArtifacts(messages: ChatMessage[]): Map<string, ChatArtifact[]> {
  const candidates: ChatArtifact[] = [];
  const versions = new Map<string, number>();
  const seenWrites = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool" || part.state.status === "error") continue;
      for (const path of artifactPaths(part)) {
        const writeKey = `${path}\u0000${part.callID || part.id}`;
        if (!seenWrites.has(writeKey)) {
          versions.set(path, (versions.get(path) ?? 0) + 1);
          seenWrites.add(writeKey);
        }
        candidates.push({
          id: `${part.id}:${path}`,
          partId: part.id,
          path,
          name: basename(path),
          type: classifyArtifact(path),
          version: versions.get(path) ?? 1,
          status: part.state.status,
        });
      }
    }
  }

  const newestByPath = new Map<string, ChatArtifact>();
  for (const artifact of candidates) newestByPath.set(artifact.path, artifact);
  const byPart = new Map<string, ChatArtifact[]>();
  for (const artifact of newestByPath.values()) byPart.set(artifact.partId, [...(byPart.get(artifact.partId) ?? []), artifact]);
  return byPart;
}
