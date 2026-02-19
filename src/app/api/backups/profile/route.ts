import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { getBackupProfile } from "@/lib/api/modules/backups/backups.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "user");

  const profile = await getBackupProfile(auth.sub);
  return NextResponse.json(profile);
});
