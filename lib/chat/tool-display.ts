import type { ChatMessage } from "@ipollowork/chat-client";

export type ChatToolPart = Extract<ChatMessage["parts"][number], { type: "tool" }>;

export type ToolDisplayKind =
  | "read"
  | "write"
  | "edit"
  | "exec"
  | "searchFiles"
  | "listDir"
  | "web"
  | "task"
  | "generic";

export type WebResult = {
  title: string;
  url: string;
};

const PATH_KEYS = ["path", "file_path", "filepath", "filename", "file", "target_file", "target", "uri"];
const QUERY_KEYS = ["query", "q", "search_term", "searchTerm"];
const COMMAND_KEYS = ["command", "cmd", "shell", "script"];

export function classifyTool(tool: string): ToolDisplayKind {
  const key = tool.trim().toLowerCase();
  if (/web|browser|fetch|url/.test(key)) return "web";
  if (/bash|terminal|shell|exec|command|run_terminal/.test(key)) return "exec";
  if (/task|todo|plan/.test(key)) return "task";
  if (/write|create|apply_patch/.test(key)) return "write";
  if (/edit|replace|patch/.test(key)) return "edit";
  if (/read|skill/.test(key)) return "read";
  if (/list.*dir|directory|readdir/.test(key)) return "listDir";
  if (/glob|file_search|search.*file|grep|find/.test(key)) return "searchFiles";
  return "generic";
}

/** Keep protocol data intact while suppressing duplicate/internal-only UI rows. */
export function isCoreToolPart(entry: ChatToolPart): boolean {
  const kind = classifyTool(entry.tool);
  return kind !== "task" && kind !== "listDir";
}

function firstString(value: unknown, keys: string[], depth = 0): string | undefined {
  if (!value || typeof value !== "object" || depth > 6) return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  for (const candidate of Object.values(record)) {
    const found = firstString(candidate, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
}

export function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/\/$/u, "");
  return normalized.slice(normalized.lastIndexOf("/") + 1) || path;
}

function compact(value: string, limit = 28): string {
  const oneLine = value.replace(/\s+/gu, " ").trim();
  return oneLine.length <= limit ? oneLine : `${oneLine.slice(0, limit)}…`;
}

/** A single, intentionally short target shown inside a status capsule. */
export function toolTarget(entry: ChatToolPart): string | undefined {
  const kind = classifyTool(entry.tool);
  if (kind === "web") {
    const query = firstString(entry.state.input, QUERY_KEYS);
    return query ? compact(query, 24) : undefined;
  }
  if (kind === "exec") return undefined;
  if (kind === "task" || kind === "generic") return undefined;
  const path = firstString(entry.state.input, [...PATH_KEYS, "skill", "name"]);
  if (path) return compact(basename(path), 24);
  if (kind === "searchFiles") {
    const query = firstString(entry.state.input, [...QUERY_KEYS, "pattern", "glob"]);
    return query ? compact(query, 24) : undefined;
  }
  return undefined;
}

export function toolContext(entry: ChatToolPart): string | undefined {
  const kind = classifyTool(entry.tool);
  const keys = kind === "web" ? QUERY_KEYS : kind === "exec" ? COMMAND_KEYS : [...PATH_KEYS, "skill", "name"];
  return firstString(entry.state.input, keys);
}

export function serializeToolInput(entry: ChatToolPart): string {
  if (!Object.keys(entry.state.input).length) return "";
  try {
    return JSON.stringify(entry.state.input, null, 2);
  } catch {
    return String(entry.state.input);
  }
}

export function toolOutput(entry: ChatToolPart): string {
  if (entry.state.status === "completed") return entry.state.output;
  if (entry.state.status === "error") return entry.state.error;
  return "";
}

function cleanUrl(raw: string): string {
  let end = raw.length;
  const trailing = new Set([")", ",", ".", ";", ":", "!", "?", "]", "}", ">", "'", "\""]);
  while (end > 0 && trailing.has(raw[end - 1] ?? "")) end -= 1;
  return raw.slice(0, end);
}

export function extractHttpUrls(...values: string[]): string[] {
  const urls = new Set<string>();
  for (const value of values) {
    for (const match of value.matchAll(/https?:\/\/[^\s<>()\[\]{}"']+/giu)) {
      const url = cleanUrl(match[0]);
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

function resultTitle(record: Record<string, unknown>): string | undefined {
  for (const key of ["title", "name", "label", "text"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return compact(value, 90);
  }
  return undefined;
}

function collectStructuredResults(value: unknown, output: WebResult[], depth = 0): void {
  if (!value || typeof value !== "object" || depth > 8) return;
  if (Array.isArray(value)) {
    for (const item of value) collectStructuredResults(item, output, depth + 1);
    return;
  }
  const record = value as Record<string, unknown>;
  const rawUrl = record.url ?? record.href ?? record.link;
  if (typeof rawUrl === "string" && /^https?:\/\//iu.test(rawUrl.trim())) {
    const url = cleanUrl(rawUrl.trim());
    output.push({ title: resultTitle(record) ?? new URL(url).hostname, url });
  }
  for (const child of Object.values(record)) collectStructuredResults(child, output, depth + 1);
}

function cleanResultLine(line: string): string {
  return line
    .replace(/^[\s>*#\-\d.)]+/u, "")
    .replace(/^(?:title|标题|名称)\s*:\s*/iu, "")
    .replace(/[|—–-]+$/u, "")
    .trim();
}

function lineTitle(line: string, url: string, previousLine?: string): string {
  const markdown = /\[([^\]]+)\]\(https?:\/\//u.exec(line)?.[1];
  if (markdown) return compact(markdown, 90);
  const remaining = cleanResultLine(line.replace(url, ""));
  if (remaining && !/^(?:url|链接|網址|网址)\s*:?$/iu.test(remaining)) return compact(remaining, 90);
  const previous = previousLine ? cleanResultLine(previousLine) : "";
  if (previous && !/^(?:url|链接|網址|网址)\s*:?$/iu.test(previous)) return compact(previous, 90);
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Extracts addressable result rows from both JSON tool output and plain text/Markdown. */
export function extractWebResults(output: string): WebResult[] {
  const results: WebResult[] = [];
  const trimmed = output.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      collectStructuredResults(JSON.parse(trimmed) as unknown, results);
    } catch {
      // Many tool outputs mix prose and JSON; the line parser below still handles them.
    }
  }
  const lines = output.split(/\r?\n/u);
  let previousNonEmpty: string | undefined;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const candidate = line.trim();
    if (candidate.startsWith("{") || candidate.startsWith("[")) {
      try {
        collectStructuredResults(JSON.parse(candidate) as unknown, results);
      } catch {
        // Continue with URL extraction for truncated or prose-wrapped JSON.
      }
    }
    for (const url of extractHttpUrls(line)) results.push({ title: lineTitle(line, url, previousNonEmpty), url });
    if (line.trim()) previousNonEmpty = line;
  }
  const unique = new Map<string, WebResult>();
  for (const result of results) if (!unique.has(result.url)) unique.set(result.url, result);
  return [...unique.values()];
}
