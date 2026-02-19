import path from "path";
import fs from "fs/promises";
import { dbPaths } from "@/lib/db/paths";
import {
  readJsonFile,
  withFileWriteLock,
  writeJsonAtomic,
  writeJsonAtomicUnlocked,
} from "@/lib/db/file-store";
import { HttpError } from "@/lib/api/http-error";
import { UserRecord } from "../shared/auth.types";

type PhoneIndex = Record<string, string>;

function getUserFilePath(userId: string): string {
  return path.join(dbPaths.usersById, `${userId}.json`);
}

export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const index = await readJsonFile<PhoneIndex>(dbPaths.usersPhoneIndex, {});
  const userId = index[phone];

  if (!userId) {
    return null;
  }

  return readJsonFile<UserRecord | null>(getUserFilePath(userId), null);
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  return readJsonFile<UserRecord | null>(getUserFilePath(userId), null);
}

export async function createUser(record: UserRecord): Promise<void> {
  await withFileWriteLock(dbPaths.usersPhoneIndex, async () => {
    const index = await readJsonFile<PhoneIndex>(dbPaths.usersPhoneIndex, {});

    if (index[record.phone]) {
      throw new HttpError(409, "Phone number already exists.");
    }

    const nextIndex: PhoneIndex = {
      ...index,
      [record.phone]: record.id,
    };

    await writeJsonAtomic(getUserFilePath(record.id), record);
    await writeJsonAtomicUnlocked(dbPaths.usersPhoneIndex, nextIndex);
  });
}

export async function listUsers(): Promise<UserRecord[]> {
  const files = await fs.readdir(dbPaths.usersById).catch(() => []);
  const users = await Promise.all(
    files
      .filter((name) => name.endsWith(".json"))
      .map((name) =>
        readJsonFile<UserRecord | null>(path.join(dbPaths.usersById, name), null),
      ),
  );

  return users
    .filter((item): item is UserRecord => item !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
