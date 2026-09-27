import { createHash, randomUUID } from "node:crypto";
import { mkdir, lstat, readdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { VolumeFileType } from "e2b";

import { env } from "./env.js";
import { pool } from "./db.js";
import { userWorkspaceLockKey, withSessionLock } from "./session-lock.js";
import { userVolume } from "./volumes.js";

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;

function isVolumeMissing(error: unknown) {
  const value = error as { name?: string; status?: number; statusCode?: number };
  return value?.status === 404 || value?.statusCode === 404 || value?.name === "VolumePathNotFoundError" || value?.name === "NotFoundError";
}

async function ensureVolumeDirectory(volume: Awaited<ReturnType<typeof userVolume>>, path: string) {
  await volume.makeDir(path, { mode: 0o700, uid: 1000, gid: 1000, force: true });
}

async function checkedVolumeFile(userId: string, path: string, allowMissingLeaf: boolean) {
  const volume = await userVolume(userId);
  await ensureVolumeDirectory(volume, "/workspace");
  const parts = checkedRelativePath(path);
  let current = "";
  for (let index = 0; index < parts.length; index += 1) {
    current += `/${parts[index]}`;
    try {
      const info = await volume.getInfo(`/workspace${current}`);
      if (info.type === VolumeFileType.SYMLINK) throw new Error("SYMLINK_NOT_ALLOWED");
      if (index < parts.length - 1 && info.type !== VolumeFileType.DIRECTORY) throw new Error("NOT_A_DIRECTORY");
    } catch (error) {
      if (!isVolumeMissing(error) || !allowMissingLeaf) throw error;
      if (index < parts.length - 1) {
        await ensureVolumeDirectory(volume, `/workspace${parts.slice(0, index + 1).join("/")}`);
      }
    }
  }
  return { volume, path: `/workspace/${parts.join("/")}`, relativePath: parts.join("/") };
}

async function remoteListWorkspaceFiles(userId: string, directory = "") {
  const volume = await userVolume(userId);
  await ensureVolumeDirectory(volume, "/workspace");
  const normalized = directory ? checkedRelativePath(directory).join("/") : "";
  if (normalized) {
    const location = await checkedVolumeFile(userId, normalized, false);
    const info = await volume.getInfo(location.path);
    if (info.type !== VolumeFileType.DIRECTORY) throw new Error("NOT_A_DIRECTORY");
  }
  const entries = await volume.list(normalized ? `/workspace/${normalized}` : "/workspace");
  return entries.filter((entry) => entry.name !== ".openmuse" && entry.type !== VolumeFileType.SYMLINK).map((entry) => ({
    name: entry.name,
    path: normalized ? `${normalized}/${entry.name}` : entry.name,
    type: entry.type === VolumeFileType.DIRECTORY ? "directory" : entry.type === VolumeFileType.FILE ? "file" : "other",
    size: entry.size ?? 0,
    updatedAt: entry.mtime.getTime(),
  })).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
}

async function remoteReadWorkspaceFile(userId: string, path: string) {
  const location = await checkedVolumeFile(userId, path, false);
  const info = await location.volume.getInfo(location.path);
  if (info.type !== VolumeFileType.FILE) throw new Error("NOT_A_FILE");
  if (info.size > MAX_TEXT_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  const bytes = await location.volume.readFile(location.path, { format: "bytes" });
  const content = Buffer.from(bytes).toString("utf8");
  return { path: location.relativePath, content, bytes: bytes.byteLength, updatedAt: info.mtime.getTime(), revision: createHash("sha256").update(bytes).digest("hex"), writable: true };
}

async function remoteWriteWorkspaceFile(userId: string, path: string, content: string, baseRevision?: string) {
  const data = Buffer.from(content, "utf8");
  if (data.byteLength > MAX_TEXT_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  const location = await checkedVolumeFile(userId, path, true);
  let currentRevision: string | undefined;
  try {
    const info = await location.volume.getInfo(location.path);
    if (info.type !== VolumeFileType.FILE) throw new Error("NOT_A_FILE");
    const current = await location.volume.readFile(location.path, { format: "bytes" });
    currentRevision = createHash("sha256").update(current).digest("hex");
    if (baseRevision && currentRevision !== baseRevision) throw new Error("REVISION_CONFLICT");
  } catch (error) {
    if (!isVolumeMissing(error)) throw error;
    if (baseRevision) throw new Error("REVISION_CONFLICT");
  }
  const parent = location.path.slice(0, location.path.lastIndexOf("/"));
  await ensureVolumeDirectory(location.volume, parent);
  await location.volume.writeFile(location.path, data, { mode: 0o600, force: true });
  const info = await location.volume.getInfo(location.path);
  return { path: location.relativePath, bytes: data.byteLength, updatedAt: info.mtime.getTime(), revision: createHash("sha256").update(data).digest("hex"), writable: true };
}

async function remoteDeleteWorkspaceFile(userId: string, path: string) {
  const location = await checkedVolumeFile(userId, path, false);
  const info = await location.volume.getInfo(location.path);
  if (info.type !== VolumeFileType.FILE) throw new Error("NOT_A_FILE");
  await location.volume.remove(location.path);
  return { path: location.relativePath, deleted: true };
}

export function userDataPath(userId: string) {
  const accountKey = createHash("sha256").update(userId).digest("hex");
  return resolve(env.dataDir, "users", accountKey);
}

export async function ensureUserWorkspace(userId: string, sessionId?: string) {
  const accountPath = userDataPath(userId);
  const workspace = resolve(accountPath, "workspace");
  const dshHomeRoot = resolve(accountPath, "dsh-home");
  const dshHome = sessionId
    ? resolve(dshHomeRoot, createHash("sha256").update(sessionId).digest("hex"))
    : dshHomeRoot;
  const browserProfile = resolve(accountPath, "browser-profile");
  await Promise.all([accountPath, workspace, dshHome, browserProfile, resolve(workspace, ".openmuse/skills")].map(async (path) => {
    await mkdir(path, { recursive: true, mode: 0o700 });
  }));
  return { accountPath, workspace, dshHome, browserProfile };
}

export async function deleteUserSessionRuntime(userId: string, sessionId: string) {
  if (env.sandboxProvider === "e2b") {
    await withSessionLock(pool, userWorkspaceLockKey(userId), async (lockClient) => {
      const resource = await lockClient.query("SELECT 1 FROM user_runtime_resources WHERE user_id = $1", [userId]);
      if (!resource.rowCount) return;
      const volume = await userVolume(userId, lockClient);
      const sessionPath = `/dsh-home/${createHash("sha256").update(sessionId).digest("hex")}`;
      await volume.remove(sessionPath).catch((error) => { if (!isVolumeMissing(error)) throw error; });
    });
    return;
  }
  const dshHome = resolve(userDataPath(userId), "dsh-home", createHash("sha256").update(sessionId).digest("hex"));
  await rm(dshHome, { recursive: true, force: true });
}

function checkedRelativePath(input: string) {
  const value = input.trim();
  if (!value || value.includes("\0") || value.startsWith("/") || /^[A-Za-z]:/u.test(value)) {
    throw new Error("INVALID_PATH");
  }
  const parts = value.split(/[\\/]+/u);
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error("INVALID_PATH");
  return parts;
}

async function resolveWorkspaceFile(userId: string, relativePath: string, allowMissingLeaf: boolean) {
  const { workspace } = await ensureUserWorkspace(userId);
  const parts = checkedRelativePath(relativePath);
  const target = resolve(workspace, ...parts);
  const rel = relative(workspace, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || resolve(workspace, rel) !== target) throw new Error("INVALID_PATH");

  let cursor = workspace;
  for (let index = 0; index < parts.length; index += 1) {
    cursor = resolve(cursor, parts[index]!);
    try {
      const info = await lstat(cursor);
      if (info.isSymbolicLink()) throw new Error("SYMLINK_NOT_ALLOWED");
      if (index < parts.length - 1 && !info.isDirectory()) throw new Error("NOT_A_DIRECTORY");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && allowMissingLeaf) break;
      throw error;
    }
  }
  return { workspace, target, relativePath: parts.join("/") };
}

export async function listWorkspaceFiles(userId: string, directory = "") {
  if (env.sandboxProvider === "e2b") return withSessionLock(pool, userWorkspaceLockKey(userId), () => remoteListWorkspaceFiles(userId, directory));
  const { workspace } = await ensureUserWorkspace(userId);
  const normalized = directory ? checkedRelativePath(directory).join("/") : "";
  const location = normalized ? (await resolveWorkspaceFile(userId, normalized, false)).target : workspace;
  const info = await lstat(location);
  if (!info.isDirectory()) throw new Error("NOT_A_DIRECTORY");
  const entries = await readdir(location, { withFileTypes: true });
  const items = await Promise.all(entries.filter((entry) => entry.name !== ".openmuse").map(async (entry) => {
    const path = normalized ? `${normalized}/${entry.name}` : entry.name;
    const itemPath = resolve(location, entry.name);
    const itemInfo = await lstat(itemPath);
    if (itemInfo.isSymbolicLink()) return null;
    return {
      name: entry.name,
      path,
      type: itemInfo.isDirectory() ? "directory" : itemInfo.isFile() ? "file" : "other",
      size: itemInfo.isFile() ? itemInfo.size : 0,
      updatedAt: itemInfo.mtimeMs,
    };
  }));
  return items.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
}

export async function readWorkspaceFile(userId: string, path: string) {
  if (env.sandboxProvider === "e2b") return withSessionLock(pool, userWorkspaceLockKey(userId), () => remoteReadWorkspaceFile(userId, path));
  const location = await resolveWorkspaceFile(userId, path, false);
  const info = await lstat(location.target);
  if (!info.isFile()) throw new Error("NOT_A_FILE");
  if (info.size > MAX_TEXT_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  const content = await readFile(location.target, "utf8");
  return { path: location.relativePath, content, bytes: info.size, updatedAt: info.mtimeMs, revision: createHash("sha256").update(content).digest("hex"), writable: true };
}

export async function writeWorkspaceFile(userId: string, path: string, content: string, baseRevision?: string) {
  if (env.sandboxProvider === "e2b") return withSessionLock(pool, userWorkspaceLockKey(userId), () => remoteWriteWorkspaceFile(userId, path, content, baseRevision));
  if (Buffer.byteLength(content, "utf8") > MAX_TEXT_FILE_BYTES) throw new Error("FILE_TOO_LARGE");
  const location = await resolveWorkspaceFile(userId, path, true);
  let currentRevision: string | undefined;
  try {
    const info = await lstat(location.target);
    if (!info.isFile()) throw new Error("NOT_A_FILE");
    const current = await readFile(location.target);
    currentRevision = createHash("sha256").update(current).digest("hex");
    if (baseRevision && currentRevision !== baseRevision) throw new Error("REVISION_CONFLICT");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (baseRevision) throw new Error("REVISION_CONFLICT");
  }

  await mkdir(dirname(location.target), { recursive: true, mode: 0o700 });
  const temporaryPath = resolve(dirname(location.target), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporaryPath, location.target);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
  const info = await lstat(location.target);
  return { path: location.relativePath, bytes: info.size, updatedAt: info.mtimeMs, revision: createHash("sha256").update(content).digest("hex"), writable: true };
}

export async function deleteWorkspaceFile(userId: string, path: string) {
  if (env.sandboxProvider === "e2b") return withSessionLock(pool, userWorkspaceLockKey(userId), () => remoteDeleteWorkspaceFile(userId, path));
  const location = await resolveWorkspaceFile(userId, path, false);
  const info = await lstat(location.target);
  if (!info.isFile()) throw new Error("NOT_A_FILE");
  await unlink(location.target);
  return { path: location.relativePath, deleted: true };
}

export async function writeWorkspaceBinary(userId: string, path: string, data: Buffer) {
  if (env.sandboxProvider === "e2b") {
    return withSessionLock(pool, userWorkspaceLockKey(userId), async () => {
      const location = await checkedVolumeFile(userId, path, true);
      await ensureVolumeDirectory(location.volume, dirname(location.path));
      await location.volume.writeFile(location.path, data, { mode: 0o600, force: true });
      return location.relativePath;
    });
  }
  const location = await resolveWorkspaceFile(userId, path, true);
  await mkdir(dirname(location.target), { recursive: true, mode: 0o700 });
  const temporaryPath = resolve(dirname(location.target), `.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, data, { mode: 0o600, flag: "wx" });
    await rename(temporaryPath, location.target);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
  return location.relativePath;
}

export async function readWorkspaceBinary(userId: string, path: string) {
  if (env.sandboxProvider === "e2b") {
    return withSessionLock(pool, userWorkspaceLockKey(userId), async () => {
      const location = await checkedVolumeFile(userId, path, false);
      const info = await location.volume.getInfo(location.path);
      if (info.type !== VolumeFileType.FILE) throw new Error("NOT_A_FILE");
      return Buffer.from(await location.volume.readFile(location.path, { format: "bytes" }));
    });
  }
  const location = await resolveWorkspaceFile(userId, path, false);
  const info = await lstat(location.target);
  if (!info.isFile()) throw new Error("NOT_A_FILE");
  return readFile(location.target);
}
