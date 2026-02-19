import { bootstrapDbStructure, seedDbFilesIfMissing } from "@/lib/db/bootstrap";

let bootstrapPromise: Promise<void> | null = null;

export async function ensureDbReady(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await bootstrapDbStructure();
      await seedDbFilesIfMissing();
    })();
  }

  try {
    await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = null;
    throw error;
  }
}
