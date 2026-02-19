import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/api/http-error";

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ message: error.message }, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join(", ");
    return NextResponse.json({ message }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ message }, { status: 500 });
}
