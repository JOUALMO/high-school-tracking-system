import { dbPaths } from "./paths";
import { ensureDir, ensureFile, readJsonFile, writeJsonAtomic } from "./file-store";

export async function bootstrapDbStructure(): Promise<void> {
  await Promise.all([
    ensureDir(dbPaths.adminsById),
    ensureDir(dbPaths.usersById),
    ensureDir(dbPaths.usersProgress),
    ensureDir(dbPaths.curriculaVersions),
    ensureDir(dbPaths.backupsJobs),
    ensureDir(dbPaths.backupsFiles),
    ensureDir(dbPaths.auditDir),
  ]);

  await Promise.all([
    ensureFile(dbPaths.adminsEmailIndex, "{}\n"),
    ensureFile(dbPaths.usersPhoneIndex, "{}\n"),
    ensureFile(dbPaths.curriculaRegistry, '{"items": []}\n'),
    ensureFile(dbPaths.auditEvents),
  ]);
}

export async function seedDbFilesIfMissing(): Promise<void> {
  // Idempotent writes for expected JSON file shapes.
  await Promise.all([
    writeJsonAtomic(
      dbPaths.adminsEmailIndex,
      await safeObject(dbPaths.adminsEmailIndex),
    ),
    writeJsonAtomic(
      dbPaths.usersPhoneIndex,
      await safeObject(dbPaths.usersPhoneIndex),
    ),
    writeJsonAtomic(
      dbPaths.curriculaRegistry,
      await safeRegistry(dbPaths.curriculaRegistry),
    ),
  ]);
}

async function safeObject(filePath: string): Promise<Record<string, string>> {
  try {
    const parsed = await readJsonFile<Record<string, string>>(filePath, {});
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

async function safeRegistry(filePath: string): Promise<{ items: unknown[] }> {
  try {
    const value = await readJsonFile<{ items?: unknown[] }>(filePath, {
      items: [],
    });
    return { items: Array.isArray(value.items) ? value.items : [] };
  } catch {
    return { items: [] };
  }
}
