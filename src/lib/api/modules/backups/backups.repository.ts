import { createHash, randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";
import { HttpError } from "@/lib/api/http-error";
import { dbPaths } from "@/lib/db/paths";
import { ensureDir, readJsonFile, writeJsonAtomic } from "@/lib/db/file-store";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export type BackupFrequency = "daily" | "weekly" | "monthly";

type BackupCompression = "none" | "gzip";

interface BackupSettingsRecord {
  userId: string;
  frequency: BackupFrequency;
  updatedAt: string;
}

export interface BackupHistoryItem {
  id: string;
  createdAt: string;
  bytes: number;
  compression: BackupCompression;
  stateHash: string;
  fileName: string;
}

interface BackupHistoryRecord {
  userId: string;
  items: BackupHistoryItem[];
}

export interface BackupProfile {
  settings: BackupSettingsRecord;
  latestBackup: BackupHistoryItem | null;
  history: BackupHistoryItem[];
  dueNow: boolean;
}

export interface LatestBackupPayload {
  id: string;
  createdAt: string;
  state: unknown;
}

export interface RunBackupResult {
  item: BackupHistoryItem;
  stored: boolean;
  deduped: boolean;
}

const HISTORY_LIMIT = 20;
const MIN_BACKUP_INTERVAL_MS = 60 * 1000;

export async function getBackupProfile(userId: string): Promise<BackupProfile> {
  const settings = await readSettings(userId);
  const history = await readHistory(userId);
  const latest = history.items[0] ?? null;

  return {
    settings,
    latestBackup: latest,
    history: history.items,
    dueNow: isBackupDue(settings.frequency, latest?.createdAt ?? null),
  };
}

export async function updateBackupFrequency(
  userId: string,
  frequency: BackupFrequency,
): Promise<BackupSettingsRecord> {
  const next: BackupSettingsRecord = {
    userId,
    frequency,
    updatedAt: new Date().toISOString(),
  };
  await writeJsonAtomic(getSettingsFilePath(userId), next);
  return next;
}

export async function runUserBackup(
  userId: string,
  state: unknown,
): Promise<RunBackupResult> {
  const userDir = getUserBackupDir(userId);
  await ensureDir(userDir);

  const history = await readHistory(userId);
  const latest = history.items[0] ?? null;
  const stateHash = hashState(state);
  const nowMs = Date.now();

  if (latest && latest.stateHash === stateHash) {
    return {
      item: latest,
      stored: false,
      deduped: true,
    };
  }

  const latestCreatedMs = latest ? Date.parse(latest.createdAt) : NaN;
  if (latest && Number.isFinite(latestCreatedMs)) {
    const elapsedMs = nowMs - latestCreatedMs;
    if (elapsedMs < MIN_BACKUP_INTERVAL_MS) {
      const waitMs = MIN_BACKUP_INTERVAL_MS - elapsedMs;
      const waitSeconds = Math.max(1, Math.ceil(waitMs / 1000));
      throw new HttpError(
        429,
        `Backup was just created. Please wait ${waitSeconds}s before creating another one.`,
      );
    }
  }

  const createdAt = new Date(nowMs).toISOString();
  const backupId = `bkp_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const fileName = `${backupId}.json.gz`;
  const payload = {
    id: backupId,
    userId,
    createdAt,
    state,
  };

  const payloadText = `${JSON.stringify(payload, null, 2)}\n`;
  const compressed = await gzipAsync(Buffer.from(payloadText, "utf8"), {
    level: 9,
  });
  const backupFile = path.join(userDir, fileName);
  await fs.writeFile(backupFile, compressed);

  const item: BackupHistoryItem = {
    id: backupId,
    createdAt,
    bytes: compressed.byteLength,
    compression: "gzip",
    stateHash,
    fileName,
  };

  const nextHistory: BackupHistoryRecord = {
    userId,
    items: [item, ...history.items].slice(0, HISTORY_LIMIT),
  };
  await writeJsonAtomic(getHistoryFilePath(userId), nextHistory);

  return {
    item,
    stored: true,
    deduped: false,
  };
}

export async function getLatestBackupState(
  userId: string,
): Promise<LatestBackupPayload | null> {
  const history = await readHistory(userId);
  const latest = history.items[0];

  if (!latest) {
    return null;
  }

  const payload = await readBackupPayload(userId, latest);
  if (!payload) {
    return null;
  }

  return {
    id: payload.id,
    createdAt: payload.createdAt,
    state: payload.state,
  };
}

function getSettingsFilePath(userId: string): string {
  return path.join(dbPaths.backupsJobs, `${userId}.json`);
}

function getUserBackupDir(userId: string): string {
  return path.join(dbPaths.backupsFiles, userId);
}

function getHistoryFilePath(userId: string): string {
  return path.join(getUserBackupDir(userId), "index.json");
}

async function readSettings(userId: string): Promise<BackupSettingsRecord> {
  const fallback: BackupSettingsRecord = {
    userId,
    frequency: "weekly",
    updatedAt: new Date().toISOString(),
  };

  const parsed = await readJsonFile<Partial<BackupSettingsRecord>>(
    getSettingsFilePath(userId),
    fallback,
  );

  const frequency =
    parsed.frequency === "daily" ||
    parsed.frequency === "weekly" ||
    parsed.frequency === "monthly"
      ? parsed.frequency
      : fallback.frequency;

  return {
    userId,
    frequency,
    updatedAt:
      typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
  };
}

async function readHistory(userId: string): Promise<BackupHistoryRecord> {
  const fallback: BackupHistoryRecord = {
    userId,
    items: [],
  };

  const parsed = await readJsonFile<{ userId?: unknown; items?: unknown[] }>(
    getHistoryFilePath(userId),
    fallback,
  );

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map(mapToHistoryItem)
        .filter((item): item is BackupHistoryItem => item !== null)
    : [];

  return {
    userId,
    items: items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, HISTORY_LIMIT),
  };
}

function mapToHistoryItem(value: unknown): BackupHistoryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = "id" in value ? value.id : null;
  const createdAt = "createdAt" in value ? value.createdAt : null;
  const bytes = "bytes" in value ? value.bytes : null;
  const compressionRaw = "compression" in value ? value.compression : null;
  const stateHashRaw = "stateHash" in value ? value.stateHash : null;
  const fileNameRaw = "fileName" in value ? value.fileName : null;

  if (
    typeof id !== "string" ||
    typeof createdAt !== "string" ||
    typeof bytes !== "number" ||
    bytes < 0
  ) {
    return null;
  }

  const compression: BackupCompression =
    compressionRaw === "gzip" ? "gzip" : "none";

  return {
    id,
    createdAt,
    bytes,
    compression,
    stateHash: typeof stateHashRaw === "string" ? stateHashRaw : "",
    fileName:
      typeof fileNameRaw === "string" && fileNameRaw.trim().length > 0
        ? fileNameRaw
        : compression === "gzip"
          ? `${id}.json.gz`
          : `${id}.json`,
  };
}

async function readBackupPayload(
  userId: string,
  item: BackupHistoryItem,
): Promise<{ id: string; createdAt: string; state: unknown } | null> {
  const userDir = getUserBackupDir(userId);
  const candidates = getPayloadCandidates(userDir, item);

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate.path);
      const text =
        candidate.compression === "gzip"
          ? (await gunzipAsync(raw)).toString("utf8")
          : raw.toString("utf8");
      const parsed = JSON.parse(text) as {
        id?: unknown;
        createdAt?: unknown;
        state?: unknown;
      };

      if (
        !parsed ||
        typeof parsed.id !== "string" ||
        typeof parsed.createdAt !== "string" ||
        !("state" in parsed)
      ) {
        continue;
      }

      return {
        id: parsed.id,
        createdAt: parsed.createdAt,
        state: parsed.state,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function getPayloadCandidates(
  userDir: string,
  item: BackupHistoryItem,
): Array<{ path: string; compression: BackupCompression }> {
  const candidates: Array<{ path: string; compression: BackupCompression }> = [
    { path: path.join(userDir, item.fileName), compression: item.compression },
  ];

  const gzPath = path.join(userDir, `${item.id}.json.gz`);
  const jsonPath = path.join(userDir, `${item.id}.json`);

  if (item.fileName !== `${item.id}.json.gz`) {
    candidates.push({ path: gzPath, compression: "gzip" });
  }

  if (item.fileName !== `${item.id}.json`) {
    candidates.push({ path: jsonPath, compression: "none" });
  }

  return candidates;
}

function hashState(state: unknown): string {
  const normalized = stableStringify(state);
  return createHash("sha256").update(normalized).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const input = value as Record<string, unknown>;
  const keys = Object.keys(input).sort((a, b) => a.localeCompare(b));
  const output: Record<string, unknown> = {};

  for (const key of keys) {
    output[key] = sortJsonValue(input[key]);
  }

  return output;
}

function isBackupDue(
  frequency: BackupFrequency,
  lastBackupAt: string | null,
): boolean {
  if (!lastBackupAt) {
    return true;
  }

  const last = Date.parse(lastBackupAt);
  if (!Number.isFinite(last)) {
    return true;
  }

  const elapsedMs = Date.now() - last;
  const dayMs = 24 * 60 * 60 * 1000;
  const threshold =
    frequency === "daily" ? dayMs : frequency === "weekly" ? 7 * dayMs : 30 * dayMs;

  return elapsedMs >= threshold;
}
