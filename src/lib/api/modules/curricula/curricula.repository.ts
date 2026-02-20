import { randomUUID } from "crypto";
import { HttpError } from "@/lib/api/http-error";
import {
  CurriculumDocument,
  CurriculumModel,
  CurriculumVersionDocument,
} from "@/lib/db/models";
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

type CurriculumMetadata = Omit<CurriculumDocument, "versions">;

export async function listAllCurricula(): Promise<CurriculumRegistryItem[]> {
  const rows = await CurriculumModel.find({}, { _id: 0, versions: 0 })
    .lean<CurriculumMetadata[]>()
    .exec();

  return rows
    .map(mapToRegistryItem)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listPublicCurricula(): Promise<PublicCurriculumItem[]> {
  const items = await listAllCurricula();
  return items
    .filter((item) => item.status === "published")
    .map((item) => ({ id: item.id, title: item.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function hasPublishedCurriculum(curriculumId: string): Promise<boolean> {
  const count = await CurriculumModel.countDocuments({
    id: curriculumId,
    status: "published",
  }).exec();

  return count > 0;
}

export async function createCurriculum(
  input: CreateCurriculumInput,
): Promise<CurriculumRegistryItem> {
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

  const versionRecord: CurriculumVersionDocument = {
    id: `${curriculumId}_v1`,
    curriculumId,
    version: 1,
    title: item.title,
    data: sanitized,
    createdBy: input.createdBy,
    createdAt: now,
  };

  await CurriculumModel.create({
    ...item,
    versions: [versionRecord],
  });

  return item;
}

export async function getCurriculumDetails(
  curriculumId: string,
): Promise<CurriculumDetails> {
  const doc = await CurriculumModel.findOne({ id: curriculumId }, { _id: 0 })
    .lean<CurriculumDocument>()
    .exec();

  if (!doc) {
    throw new HttpError(404, "Curriculum not found.");
  }

  const versions = Array.isArray(doc.versions)
    ? doc.versions.map(mapToVersionRecord).sort((a, b) => b.version - a.version)
    : [];

  const activeVersion = versions.find((value) => value.version === doc.activeVersion);

  if (!activeVersion) {
    throw new HttpError(404, "Curriculum version not found.");
  }

  return {
    item: mapToRegistryItem(doc),
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
  const existing = await CurriculumModel.findOne({ id: curriculumId }, { _id: 0, versions: 0 })
    .lean<CurriculumMetadata>()
    .exec();

  if (!existing) {
    throw new HttpError(404, "Curriculum not found.");
  }

  const now = new Date().toISOString();
  const nextVersion = existing.activeVersion + 1;
  const nextTitle = input.title.trim();
  const sanitized = sanitizeCurriculumData(input.data);

  const versionRecord: CurriculumVersionDocument = {
    id: `${curriculumId}_v${nextVersion}`,
    curriculumId,
    version: nextVersion,
    title: nextTitle,
    data: sanitized,
    createdBy: input.updatedBy,
    createdAt: now,
  };

  const updated = await CurriculumModel.findOneAndUpdate(
    { id: curriculumId },
    {
      $set: {
        title: nextTitle,
        activeVersion: nextVersion,
        updatedAt: now,
      },
      $push: {
        versions: versionRecord,
      },
    },
    {
      new: true,
      projection: { _id: 0, versions: 0 },
    },
  )
    .lean<CurriculumMetadata>()
    .exec();

  if (!updated) {
    throw new HttpError(404, "Curriculum not found.");
  }

  return mapToRegistryItem(updated);
}

export async function deleteCurriculum(curriculumId: string): Promise<void> {
  const result = await CurriculumModel.deleteOne({ id: curriculumId }).exec();

  if (result.deletedCount === 0) {
    throw new HttpError(404, "Curriculum not found.");
  }
}

export async function updateCurriculumStatus(
  curriculumId: string,
  status: CurriculumStatus,
): Promise<CurriculumRegistryItem> {
  const updated = await CurriculumModel.findOneAndUpdate(
    { id: curriculumId },
    {
      $set: {
        status,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      new: true,
      projection: { _id: 0, versions: 0 },
    },
  )
    .lean<CurriculumMetadata>()
    .exec();

  if (!updated) {
    throw new HttpError(404, "Curriculum not found.");
  }

  return mapToRegistryItem(updated);
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
  const doc = await CurriculumModel.findOne({ id: curriculumId }, { _id: 0 })
    .lean<CurriculumDocument>()
    .exec();

  if (!doc) {
    return null;
  }

  const active = Array.isArray(doc.versions)
    ? doc.versions.find((value) => value.version === doc.activeVersion)
    : null;

  if (!active) {
    return null;
  }

  return {
    id: doc.id,
    title: doc.title,
    version: doc.activeVersion,
    updatedAt: doc.updatedAt,
    data: sanitizeCurriculumData(active.data),
  };
}

function mapToRegistryItem(value: CurriculumMetadata): CurriculumRegistryItem {
  return {
    id: value.id,
    title: value.title,
    status: value.status,
    activeVersion: value.activeVersion,
    createdBy: value.createdBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function mapToVersionRecord(value: CurriculumVersionDocument): CurriculumVersionRecord {
  return {
    id: value.id,
    curriculumId: value.curriculumId,
    version: value.version,
    title: value.title,
    data: sanitizeCurriculumData(value.data),
    createdBy: value.createdBy,
    createdAt: value.createdAt,
  };
}
