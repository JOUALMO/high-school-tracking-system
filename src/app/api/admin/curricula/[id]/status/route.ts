import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { updateCurriculumStatusSchema } from "@/lib/api/modules/admin/admin.schemas";
import { updateCurriculumStatus } from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

interface RouteParams {
  id: string;
}

export const PATCH = asyncHandler<RouteParams>(async (
  request: NextRequest,
  context,
) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const body = validateBody(updateCurriculumStatusSchema, await readJsonBody(request));
  const { id } = await context.params;

  const item = await updateCurriculumStatus(id, body.status);
  return NextResponse.json({ item });
});
