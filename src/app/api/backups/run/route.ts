import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { runUserBackup } from "@/lib/api/modules/backups/backups.repository";
import { runBackupSchema } from "@/lib/api/modules/backups/backups.schemas";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "user");

  const body = validateBody(runBackupSchema, await readJsonBody(request));
  const result = await runUserBackup(auth.sub, body.state);

  return NextResponse.json(result, { status: result.stored ? 201 : 200 });
});
