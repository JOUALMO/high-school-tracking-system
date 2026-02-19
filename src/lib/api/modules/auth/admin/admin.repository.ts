import path from "path";
import { dbPaths } from "@/lib/db/paths";
import {
  readJsonFile,
  withFileWriteLock,
  writeJsonAtomic,
  writeJsonAtomicUnlocked,
} from "@/lib/db/file-store";
import { HttpError } from "@/lib/api/http-error";
import { AdminRecord } from "../shared/auth.types";

type EmailIndex = Record<string, string>;

function getAdminFilePath(adminId: string): string {
  return path.join(dbPaths.adminsById, `${adminId}.json`);
}

export async function findAdminByEmail(email: string): Promise<AdminRecord | null> {
  const index = await readJsonFile<EmailIndex>(dbPaths.adminsEmailIndex, {});
  const adminId = index[email];

  if (!adminId) {
    return null;
  }

  return readJsonFile<AdminRecord | null>(getAdminFilePath(adminId), null);
}

export async function createAdmin(record: AdminRecord): Promise<void> {
  await withFileWriteLock(dbPaths.adminsEmailIndex, async () => {
    const index = await readJsonFile<EmailIndex>(dbPaths.adminsEmailIndex, {});

    if (index[record.email]) {
      throw new HttpError(409, "Admin email already exists.");
    }

    const nextIndex: EmailIndex = {
      ...index,
      [record.email]: record.id,
    };

    await writeJsonAtomic(getAdminFilePath(record.id), record);
    await writeJsonAtomicUnlocked(dbPaths.adminsEmailIndex, nextIndex);
  });
}
