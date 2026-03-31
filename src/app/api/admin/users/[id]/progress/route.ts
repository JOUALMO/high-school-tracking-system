import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { getLatestBackupState } from "@/lib/api/modules/backups/backups.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const backup = await getLatestBackupState(id);
  
  if (!backup) {
    return NextResponse.json({ backupAt: null, state: null });
  }

  return NextResponse.json({ 
    backupAt: backup.createdAt, 
    state: backup.state 
  });
});
