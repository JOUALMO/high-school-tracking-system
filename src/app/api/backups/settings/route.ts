import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { updateBackupFrequency } from "@/lib/api/modules/backups/backups.repository";
import { backupFrequencySchema } from "@/lib/api/modules/backups/backups.schemas";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const PUT = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "user");

  const body = validateBody(backupFrequencySchema, await readJsonBody(request));
  const settings = await updateBackupFrequency(auth.sub, body.frequency);

  return NextResponse.json({ settings });
});
