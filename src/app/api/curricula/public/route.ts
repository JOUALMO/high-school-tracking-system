import { NextResponse } from "next/server";
import { asyncHandler } from "@/lib/api/async-handler";
import { listPublicCurricula } from "@/lib/api/modules/curricula/curricula.repository";
import { ensureDbReady } from "@/lib/db/init";

export const runtime = "nodejs";

export const GET = asyncHandler(async () => {
  await ensureDbReady();
  const items = await listPublicCurricula();
  return NextResponse.json({ items });
});
