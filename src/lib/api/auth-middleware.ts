import { NextRequest } from "next/server";
import { HttpError } from "@/lib/api/http-error";
import { TokenPayload, verifyAuthToken } from "@/lib/api/modules/auth/shared/token";

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");

  if (header) {
    const [scheme, token] = header.split(" ");
    if (scheme === "Bearer" && token) {
      return token;
    }

    throw new HttpError(401, "Authorization header must be Bearer token.");
  }

  return request.cookies.get("studyflow_token")?.value ?? request.cookies.get("auth-token")?.value ?? null;
}

export function requireAuth(request: NextRequest): TokenPayload {
  const token = getBearerToken(request);

  if (!token) {
    throw new HttpError(401, "Authorization header is required.");
  }

  try {
    return verifyAuthToken(token);
  } catch {
    throw new HttpError(401, "Invalid or expired token.");
  }
}

export function requireRole(payload: TokenPayload, role: TokenPayload["role"]): void {
  if (payload.role !== role) {
    throw new HttpError(403, "Forbidden.");
  }
}
