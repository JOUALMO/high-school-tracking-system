import { createHash, randomUUID } from "crypto";
import { HttpError } from "@/lib/api/http-error";
import { BackupDocument, BackupItemDocument, BackupModel } from "@/lib/db/models";

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
  const doc = await readBackupDoc(userId);
  const settings = readSettings(userId, doc);
  const history = readHistoryItems(doc?.items ?? []);
  const latest = history[0] ?? null;

  return {
    settings,
    latestBackup: latest,
    history,
    dueNow: isBackupDue(settings.frequency, latest?.createdAt ?? null),
  };
}

export async function updateBackupFrequency(
  userId: string,
  frequency: BackupFrequency,
): Promise<BackupSettingsRecord> {
  const updatedAt = new Date().toISOString();

  await BackupModel.updateOne(
    { userId },
    {
      $set: {
        frequency,
        updatedAt,
      },
      $setOnInsert: {
        userId,
        items: [],
      },
    },
    { upsert: true },
  ).exec();

  return {
    userId,
    frequency,
    updatedAt,
  };
}

export async function runUserBackup(
  userId: string,
  state: unknown,
): Promise<RunBackupResult> {
  const doc = await readBackupDoc(userId);
  const history = doc?.items ?? [];
  const latest = history[0] ?? null;
  const stateHash = hashState(state);
  const nowMs = Date.now();

  if (latest && latest.stateHash === stateHash) {
    return {
      item: mapToHistoryItem(latest),
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
  const payload = {
    id: backupId,
    userId,
    createdAt,
    state,
  };
  const payloadText = `${JSON.stringify(payload, null, 2)}\n`;

  const item: BackupItemDocument = {
    id: backupId,
    createdAt,
    bytes: Buffer.byteLength(payloadText, "utf8"),
    compression: "none",
    stateHash,
    fileName: `${backupId}.json`,
    state,
  };

  const nextItems = [item, ...history].slice(0, HISTORY_LIMIT);

  await BackupModel.updateOne(
    { userId },
    {
      $set: {
        items: nextItems,
      },
      $setOnInsert: {
        userId,
        frequency: "weekly",
        updatedAt: createdAt,
      },
    },
    { upsert: true },
  ).exec();

  return {
    item: mapToHistoryItem(item),
    stored: true,
    deduped: false,
  };
}

export async function getLatestBackupState(
  userId: string,
): Promise<LatestBackupPayload | null> {
  const doc = await readBackupDoc(userId);
  const latest = doc?.items[0] ?? null;

  if (!latest) {
    return null;
  }

  return {
    id: latest.id,
    createdAt: latest.createdAt,
    state: latest.state,
  };
}

async function readBackupDoc(userId: string): Promise<BackupDocument | null> {
  return BackupModel.findOne({ userId }, { _id: 0 }).lean<BackupDocument>().exec();
}

function readSettings(userId: string, doc: BackupDocument | null): BackupSettingsRecord {
  const fallbackUpdatedAt = new Date().toISOString();

  if (!doc) {
    return {
      userId,
      frequency: "weekly",
      updatedAt: fallbackUpdatedAt,
    };
  }

  return {
    userId,
    frequency: doc.frequency,
    updatedAt: doc.updatedAt,
  };
}

function readHistoryItems(items: BackupItemDocument[]): BackupHistoryItem[] {
  return items
    .map(mapToHistoryItem)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, HISTORY_LIMIT);
}

function mapToHistoryItem(value: BackupItemDocument): BackupHistoryItem {
  return {
    id: value.id,
    createdAt: value.createdAt,
    bytes: value.bytes,
    compression: value.compression,
    stateHash: value.stateHash,
    fileName: value.fileName,
  };
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
