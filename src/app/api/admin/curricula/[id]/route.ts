import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { updateCurriculumSchema } from "@/lib/api/modules/admin/admin.schemas";
import {
  deleteCurriculum,
  getCurriculumDetails,
  updateCurriculum,
} from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

interface RouteParams {
  id: string;
}

export const GET = asyncHandler<RouteParams>(async (
  request: NextRequest,
  context,
) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const { id } = await context.params;
  const details = await getCurriculumDetails(id);
  return NextResponse.json(details);
});

export const PUT = asyncHandler<RouteParams>(async (
  request: NextRequest,
  context,
) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const body = validateBody(updateCurriculumSchema, await readJsonBody(request));
  const { id } = await context.params;

  const item = await updateCurriculum(id, {
    title: body.title,
    data: body.data,
    updatedBy: auth.sub,
  });

  return NextResponse.json({ item });
});

export const DELETE = asyncHandler<RouteParams>(async (
  request: NextRequest,
  context,
) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const { id } = await context.params;
  await deleteCurriculum(id);
  return NextResponse.json({ ok: true });
});
