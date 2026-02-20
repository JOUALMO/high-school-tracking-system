import mongoose from "mongoose";
import { env } from "@/lib/api/env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalCache = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

function getCache(): MongooseCache {
  if (!globalCache.__mongooseCache) {
    globalCache.__mongooseCache = {
      conn: null,
      promise: null,
    };
  }

  return globalCache.__mongooseCache;
}

export async function connectToMongo(): Promise<typeof mongoose> {
  const cache = getCache();

  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}
