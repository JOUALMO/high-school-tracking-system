import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { requireAuth, requireRole } from "@/lib/api/auth-middleware";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { createCurriculumSchema } from "@/lib/api/modules/admin/admin.schemas";
import {
  createCurriculum,
  listAllCurricula,
} from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const items = await listAllCurricula();
  return NextResponse.json({ items });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const auth = requireAuth(request);
  requireRole(auth, "admin");

  const body = validateBody(createCurriculumSchema, await readJsonBody(request));
  const item = await createCurriculum({
    title: body.title,
    data: body.data,
    createdBy: auth.sub,
  });

  return NextResponse.json({ item }, { status: 201 });
});
