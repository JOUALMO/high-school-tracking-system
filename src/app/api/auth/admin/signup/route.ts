import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { env } from "@/lib/api/env";
import { HttpError } from "@/lib/api/http-error";
import { readJsonBody } from "@/lib/api/request";
import { validateBody } from "@/lib/api/validate-middleware";
import { createAdmin, findAdminByEmail } from "@/lib/api/modules/auth/admin/admin.repository";
import { adminSignupSchema } from "@/lib/api/modules/auth/admin/admin.schemas";
import { hashPassword } from "@/lib/api/modules/auth/shared/password";
import { signAuthToken } from "@/lib/api/modules/auth/shared/token";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const POST = asyncHandler(async (request: NextRequest) => {
  await ensureDbReady();

  const body = validateBody(adminSignupSchema, await readJsonBody(request));

  if (body.accessPassword !== env.ADMIN_SIGNUP_ACCESS_PASSWORD) {
    throw new HttpError(403, "Invalid admin access password.");
  }

  const existing = await findAdminByEmail(body.email);
  if (existing) {
    throw new HttpError(409, "Admin email already exists.");
  }

  const now = new Date().toISOString();
  const adminId = randomUUID();

  await createAdmin({
    id: adminId,
    name: body.name,
    email: body.email,
    passwordHash: await hashPassword(body.password),
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  const token = signAuthToken({ sub: adminId, role: "admin" });

  return NextResponse.json(
    {
      token,
      user: {
        id: adminId,
        role: "admin",
        name: body.name,
        email: body.email,
      },
    },
    { status: 201 },
  );
});
