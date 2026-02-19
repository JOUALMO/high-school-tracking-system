import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { listUsers } from "@/lib/api/modules/auth/user/user.repository";
import { listAllCurricula } from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const [users, curricula] = await Promise.all([listUsers(), listAllCurricula()]);

  const publishedCount = curricula.filter((item) => item.status === "published").length;

  return NextResponse.json({
    metrics: {
      users: users.length,
      curricula: curricula.length,
      publishedCurricula: publishedCount,
      drafts: Math.max(curricula.length - publishedCount, 0),
    },
    latestUsers: users.slice(0, 5).map((user) => ({
      id: user.id,
      username: user.username,
      phone: user.phone,
      selectedCurriculumId: user.selectedCurriculumId,
      createdAt: user.createdAt,
    })),
    latestCurricula: curricula.slice(0, 5),
  });
});
