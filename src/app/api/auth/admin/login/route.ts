import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { HttpError } from "@/lib/api/http-error";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { findAdminByEmail } from "@/lib/api/modules/auth/admin/admin.repository";
import { adminLoginSchema } from "@/lib/api/modules/auth/admin/admin.schemas";
import { comparePassword } from "@/lib/api/modules/auth/shared/password";
import { signAuthToken } from "@/lib/api/modules/auth/shared/token";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const body = validateBody(adminLoginSchema, await readJsonBody(request));

  const existing = await findAdminByEmail(body.email);
  if (!existing) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const passwordOk = await comparePassword(body.password, existing.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const token = signAuthToken({ sub: existing.id, role: "admin" });

  return NextResponse.json({
    token,
    user: {
      id: existing.id,
      role: existing.role,
      name: existing.name,
      email: existing.email,
    },
  });
});
