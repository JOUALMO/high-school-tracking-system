import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

const writeChains = new Map<string, Promise<unknown>>();

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function ensureFile(filePath: string, defaultContent = ""): Promise<void> {
  await ensureDir(path.dirname(filePath));
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent, "utf8");
  }
}

export async function readJsonFile<T>(
  filePath: string,
  fallback: T,
): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function withFileWriteLock<T>(
  filePath: string,
  op: () => Promise<T>,
): Promise<T> {
  const previous = writeChains.get(filePath) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(op)
    .finally(() => {
      if (writeChains.get(filePath) === next) {
        writeChains.delete(filePath);
      }
    });

  writeChains.set(filePath, next);
  return next;
}

export async function writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
  await withFileWriteLock(filePath, async () => {
    await writeJsonAtomicUnlocked(filePath, data);
  });
}

export async function writeJsonAtomicUnlocked<T>(
  filePath: string,
  data: T,
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(tmpPath, payload, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function appendLineAtomic(filePath: string, line: string): Promise<void> {
  await withFileWriteLock(filePath, async () => {
    await ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, `${line}\n`, "utf8");
  });
}
