import os from "os";
import path from "path";
import { env } from "@/lib/api/env";

const projectRoot = process.cwd();
const runsInServerless =
  process.env.VERCEL === "1" ||
  typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string" ||
  typeof process.env.LAMBDA_TASK_ROOT === "string";

function resolveDbRoot(): string {
  if (path.isAbsolute(env.DB_DIR_NAME)) {
    return env.DB_DIR_NAME;
  }

  if (runsInServerless) {
    return path.join(os.tmpdir(), env.DB_DIR_NAME);
  }

  return path.resolve(projectRoot, env.DB_DIR_NAME);
}

export const dbRoot = resolveDbRoot();

export const dbPaths = {
  root: dbRoot,
  adminsById: path.join(dbRoot, "admins", "by-id"),
  adminsEmailIndex: path.join(dbRoot, "admins", "index-email.json"),
  usersById: path.join(dbRoot, "users", "by-id"),
  usersPhoneIndex: path.join(dbRoot, "users", "index-phone.json"),
  usersProgress: path.join(dbRoot, "users", "progress"),
  curriculaVersions: path.join(dbRoot, "curricula", "versions"),
  curriculaRegistry: path.join(dbRoot, "curricula", "registry.json"),
  backupsJobs: path.join(dbRoot, "backups", "jobs"),
  backupsFiles: path.join(dbRoot, "backups", "files"),
  auditDir: path.join(dbRoot, "audit"),
  auditEvents: path.join(dbRoot, "audit", "events.ndjson"),
};
