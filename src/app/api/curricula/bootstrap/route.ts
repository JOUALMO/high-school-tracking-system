import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { findUserById } from "@/lib/api/modules/auth/user/user.repository";
import { getLatestBackupState } from "@/lib/api/modules/backups/backups.repository";
import { getCurriculumDataById } from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "user");

  const user = await findUserById(auth.sub);

  if (!user) {
    return NextResponse.json({ curriculum: null, backup: null });
  }

  const [backup, curriculum] = await Promise.all([
    getLatestBackupState(auth.sub),
    user.selectedCurriculumId
      ? getCurriculumDataById(user.selectedCurriculumId)
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ curriculum, backup });
});
