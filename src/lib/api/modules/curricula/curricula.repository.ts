import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { dbPaths } from "@/lib/db/paths";
import {
  readJsonFile,
  withFileWriteLock,
  writeJsonAtomic,
  writeJsonAtomicUnlocked,
} from "@/lib/db/file-store";
import { HttpError } from "@/lib/api/http-error";
import {
  RawCurriculumData,
  sanitizeCurriculumData,
} from "./curriculum-sanitizer";

export type CurriculumStatus = "draft" | "published";

export interface CurriculumRegistryItem {
  id: string;
  title: string;
  status: CurriculumStatus;
  activeVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumVersionRecord {
  id: string;
  curriculumId: string;
  version: number;
  title: string;
  data: RawCurriculumData;
  createdBy: string;
  createdAt: string;
}

export interface CurriculumVersionSummary {
  id: string;
  curriculumId: string;
  version: number;
  title: string;
  createdBy: string;
  createdAt: string;
}

export interface CurriculumDetails {
  item: CurriculumRegistryItem;
  activeVersion: CurriculumVersionRecord;
  versions: CurriculumVersionSummary[];
}

interface CurriculumRegistry {
  items: CurriculumRegistryItem[];
}

export interface PublicCurriculumItem {
  id: string;
  title: string;
}

export interface CreateCurriculumInput {
  title: string;
  data: unknown;
  createdBy: string;
}

export interface UpdateCurriculumInput {
  title: string;
  data: unknown;
  updatedBy: string;
}

export async function listAllCurricula(): Promise<CurriculumRegistryItem[]> {
  const registry = await readRegistry();
  return [...registry.items].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listPublicCurricula(): Promise<PublicCurriculumItem[]> {
  const items = await listAllCurricula();
  return items
    .filter((item) => item.status === "published")
    .map((item) => ({ id: item.id, title: item.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function hasPublishedCurriculum(curriculumId: string): Promise<boolean> {
  const items = await listAllCurricula();
  return items.some(
    (item) => item.id === curriculumId && item.status === "published",
  );
}

export async function createCurriculum(
  input: CreateCurriculumInput,
): Promise<CurriculumRegistryItem> {
  return withFileWriteLock(dbPaths.curriculaRegistry, async () => {
    const registry = await readRegistry();
    const now = new Date().toISOString();
    const curriculumId = `cur_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const sanitized = sanitizeCurriculumData(input.data);

    const item: CurriculumRegistryItem = {
      id: curriculumId,
      title: input.title.trim(),
      status: "draft",
      activeVersion: 1,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const versionRecord: CurriculumVersionRecord = {
      id: `${curriculumId}_v1`,
      curriculumId,
      version: 1,
      title: item.title,
      data: sanitized,
      createdBy: input.createdBy,
      createdAt: now,
    };

    const nextRegistry: CurriculumRegistry = {
      items: [item, ...registry.items],
    };

    await writeJsonAtomic(getVersionFilePath(curriculumId, 1), versionRecord);
    await writeJsonAtomicUnlocked(dbPaths.curriculaRegistry, nextRegistry);

    return item;
  });
}

export async function getCurriculumDetails(
  curriculumId: string,
): Promise<CurriculumDetails> {
  const registry = await readRegistry();
  const item = registry.items.find((value) => value.id === curriculumId);

  if (!item) {
    throw new HttpError(404, "Curriculum not found.");
  }

  const versions = await listVersionRecords(curriculumId, item.activeVersion);
  const activeVersion = versions.find((value) => value.version === item.activeVersion);

  if (!activeVersion) {
    throw new HttpError(404, "Curriculum version not found.");
  }

  return {
    item,
    activeVersion,
    versions: versions.map(({ id, curriculumId, version, title, createdBy, createdAt }) => ({
      id,
      curriculumId,
      version,
      title,
      createdBy,
      createdAt,
    })),
  };
}

export async function updateCurriculum(
  curriculumId: string,
  input: UpdateCurriculumInput,
): Promise<CurriculumRegistryItem> {
  return withFileWriteLock(dbPaths.curriculaRegistry, async () => {
    const registry = await readRegistry();
    const target = registry.items.find((item) => item.id === curriculumId);

    if (!target) {
      throw new HttpError(404, "Curriculum not found.");
    }

    const now = new Date().toISOString();
    const nextVersion = target.activeVersion + 1;
    const nextTitle = input.title.trim();
    const sanitized = sanitizeCurriculumData(input.data);

    const versionRecord: CurriculumVersionRecord = {
      id: `${curriculumId}_v${nextVersion}`,
      curriculumId,
      version: nextVersion,
      title: nextTitle,
      data: sanitized,
      createdBy: input.updatedBy,
      createdAt: now,
    };

    const updatedItem: CurriculumRegistryItem = {
      ...target,
      title: nextTitle,
      activeVersion: nextVersion,
      updatedAt: now,
    };

    const nextRegistry: CurriculumRegistry = {
      items: registry.items.map((item) => (item.id === curriculumId ? updatedItem : item)),
    };

    await writeJsonAtomic(getVersionFilePath(curriculumId, nextVersion), versionRecord);
    await writeJsonAtomicUnlocked(dbPaths.curriculaRegistry, nextRegistry);

    return updatedItem;
  });
}

export async function deleteCurriculum(curriculumId: string): Promise<void> {
  await withFileWriteLock(dbPaths.curriculaRegistry, async () => {
    const registry = await readRegistry();
    const target = registry.items.find((item) => item.id === curriculumId);

    if (!target) {
      throw new HttpError(404, "Curriculum not found.");
    }

    const nextRegistry: CurriculumRegistry = {
      items: registry.items.filter((item) => item.id !== curriculumId),
    };

    await writeJsonAtomicUnlocked(dbPaths.curriculaRegistry, nextRegistry);

    const versionFiles = await fs.readdir(dbPaths.curriculaVersions).catch(() => []);
    await Promise.all(
      versionFiles
        .filter((name) => name.startsWith(`${curriculumId}-v`) && name.endsWith(".json"))
        .map((name) =>
          fs.rm(path.join(dbPaths.curriculaVersions, name), { force: true }),
        ),
    );
  });
}

export async function updateCurriculumStatus(
  curriculumId: string,
  status: CurriculumStatus,
): Promise<CurriculumRegistryItem> {
  return withFileWriteLock(dbPaths.curriculaRegistry, async () => {
    const registry = await readRegistry();
    const target = registry.items.find((item) => item.id === curriculumId);

    if (!target) {
      throw new HttpError(404, "Curriculum not found.");
    }

    const updated: CurriculumRegistryItem = {
      ...target,
      status,
      updatedAt: new Date().toISOString(),
    };

    const nextRegistry: CurriculumRegistry = {
      items: registry.items.map((item) =>
        item.id === curriculumId ? updated : item,
      ),
    };

    await writeJsonAtomicUnlocked(dbPaths.curriculaRegistry, nextRegistry);
    return updated;
  });
}

export async function getCurriculumDataById(
  curriculumId: string,
): Promise<{
  id: string;
  title: string;
  version: number;
  updatedAt: string;
  data: RawCurriculumData;
} | null> {
  const registry = await readRegistry();
  const item = registry.items.find((value) => value.id === curriculumId);

  if (!item) {
    return null;
  }

  const active = await readCurriculumVersion(curriculumId, item.activeVersion);
  if (!active) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    version: item.activeVersion,
    updatedAt: item.updatedAt,
    data: active.data,
  };
}

async function readRegistry(): Promise<CurriculumRegistry> {
  const raw = await readJsonFile<{ items?: unknown[] }>(dbPaths.curriculaRegistry, {
    items: [],
  });

  const items = Array.isArray(raw.items)
    ? raw.items
        .map(mapToRegistryItem)
        .filter((item): item is CurriculumRegistryItem => item !== null)
    : [];

  return { items };
}

function mapToRegistryItem(value: unknown): CurriculumRegistryItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = "id" in value ? value.id : null;
  const title = "title" in value ? value.title : null;
  const status = "status" in value ? value.status : null;
  const activeVersion = "activeVersion" in value ? value.activeVersion : 1;
  const createdBy = "createdBy" in value ? value.createdBy : "system";
  const createdAt = "createdAt" in value ? value.createdAt : null;
  const updatedAt = "updatedAt" in value ? value.updatedAt : null;

  if (typeof id !== "string" || typeof title !== "string") {
    return null;
  }

  if (status !== "draft" && status !== "published") {
    return null;
  }

  if (
    typeof activeVersion !== "number" ||
    !Number.isInteger(activeVersion) ||
    activeVersion < 1
  ) {
    return null;
  }

  const safeCreatedAt =
    typeof createdAt === "string" ? createdAt : new Date().toISOString();
  const safeUpdatedAt =
    typeof updatedAt === "string" ? updatedAt : safeCreatedAt;

  return {
    id,
    title,
    status,
    activeVersion,
    createdBy: typeof createdBy === "string" ? createdBy : "system",
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
  };
}

function getVersionFilePath(curriculumId: string, version: number): string {
  return path.join(dbPaths.curriculaVersions, `${curriculumId}-v${version}.json`);
}

async function listVersionRecords(
  curriculumId: string,
  maxVersion: number,
): Promise<CurriculumVersionRecord[]> {
  const records = await Promise.all(
    Array.from({ length: maxVersion }, (_value, index) =>
      readCurriculumVersion(curriculumId, index + 1),
    ),
  );

  return records
    .filter((item): item is CurriculumVersionRecord => item !== null)
    .sort((a, b) => b.version - a.version);
}

async function readCurriculumVersion(
  curriculumId: string,
  version: number,
): Promise<CurriculumVersionRecord | null> {
  const raw = await readJsonFile<unknown>(getVersionFilePath(curriculumId, version), null);
  return mapToVersionRecord(raw);
}

function mapToVersionRecord(value: unknown): CurriculumVersionRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const id = "id" in value ? value.id : null;
  const curriculumId = "curriculumId" in value ? value.curriculumId : null;
  const version = "version" in value ? value.version : null;
  const title = "title" in value ? value.title : null;
  const data = "data" in value ? value.data : null;
  const createdBy = "createdBy" in value ? value.createdBy : "system";
  const createdAt = "createdAt" in value ? value.createdAt : null;

  if (
    typeof id !== "string" ||
    typeof curriculumId !== "string" ||
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1 ||
    typeof title !== "string" ||
    !data
  ) {
    return null;
  }

  return {
    id,
    curriculumId,
    version,
    title,
    data: sanitizeCurriculumData(data),
    createdBy: typeof createdBy === "string" ? createdBy : "system",
    createdAt:
      typeof createdAt === "string" ? createdAt : new Date().toISOString(),
  };
}
