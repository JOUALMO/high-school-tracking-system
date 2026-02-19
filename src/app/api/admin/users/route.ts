import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { listUsers } from "@/lib/api/modules/auth/user/user.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const users = await listUsers();

  return NextResponse.json({
    items: users.map((user) => ({
      id: user.id,
      username: user.username,
      phone: user.phone,
      selectedCurriculumId: user.selectedCurriculumId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
});
