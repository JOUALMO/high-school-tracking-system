import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { HttpError } from "@/lib/api/http-error";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { createUser, findUserByPhone } from "@/lib/api/modules/auth/user/user.repository";
import { userSignupSchema } from "@/lib/api/modules/auth/user/user.schemas";
import { hashPassword } from "@/lib/api/modules/auth/shared/password";
import { signAuthToken } from "@/lib/api/modules/auth/shared/token";
import { hasPublishedCurriculum } from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const body = validateBody(userSignupSchema, await readJsonBody(request));

  const existing = await findUserByPhone(body.phone);
  if (existing) {
    throw new HttpError(409, "Phone number already exists.");
  }

  const curriculumExists = await hasPublishedCurriculum(body.curriculumId);
  if (!curriculumExists) {
    throw new HttpError(400, "Selected curriculum is not available.");
  }

  const now = new Date().toISOString();
  const userId = randomUUID();

  await createUser({
    id: userId,
    username: body.username,
    phone: body.phone,
    passwordHash: await hashPassword(body.password),
    selectedCurriculumId: body.curriculumId,
    role: "user",
    createdAt: now,
    updatedAt: now,
  });

  const token = signAuthToken({ sub: userId, role: "user" });

  return NextResponse.json(
    {
      token,
      user: {
        id: userId,
        role: "user",
        username: body.username,
        phone: body.phone,
        selectedCurriculumId: body.curriculumId,
      },
    },
    { status: 201 },
  );
});
