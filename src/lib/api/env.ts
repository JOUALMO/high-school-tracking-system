import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3001"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long."),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  ADMIN_SIGNUP_ACCESS_PASSWORD: z
    .string()
    .min(8, "ADMIN_SIGNUP_ACCESS_PASSWORD must be at least 8 characters."),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
  MONGODB_DB_NAME: z.string().min(1).default("high_school_tracking_system_app"),
  DB_DIR_NAME: z.string().min(1).default("DB"),
});

const parsed = envSchema.safeParse({
  ...process.env,
  MONGODB_URI: process.env.MONGODB_URI ?? process.env.DATABASE_URI,
});

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${message}`);
}

export const env = parsed.data;
