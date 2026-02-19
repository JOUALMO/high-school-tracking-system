import { NextRequest } from "next/server";
import { HttpError } from "@/lib/api/http-error";

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
