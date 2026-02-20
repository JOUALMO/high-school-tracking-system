import { connectToMongo } from "@/lib/db/mongoose";

let bootstrapPromise: Promise<void> | null = null;

export async function ensureDbReady(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = connectToMongo().then(() => undefined);
  }

  try {
    await bootstrapPromise;
  } catch (error) {
    bootstrapPromise = null;
    throw error;
  }
}
