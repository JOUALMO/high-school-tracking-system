import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { HttpError } from "@/lib/api/http-error";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { findUserByPhone } from "@/lib/api/modules/auth/user/user.repository";
import { userLoginSchema } from "@/lib/api/modules/auth/user/user.schemas";
import { comparePassword } from "@/lib/api/modules/auth/shared/password";
import { signAuthToken } from "@/lib/api/modules/auth/shared/token";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const body = validateBody(userLoginSchema, await readJsonBody(request));

  const existing = await findUserByPhone(body.phone);
  if (!existing) {
    throw new HttpError(401, "Invalid phone or password.");
  }

  const passwordOk = await comparePassword(body.password, existing.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, "Invalid phone or password.");
  }

  const token = signAuthToken({ sub: existing.id, role: "user" });

  return NextResponse.json({
    token,
    user: {
      id: existing.id,
      role: existing.role,
      username: existing.username,
      phone: existing.phone,
      selectedCurriculumId: existing.selectedCurriculumId,
    },
  });
});
