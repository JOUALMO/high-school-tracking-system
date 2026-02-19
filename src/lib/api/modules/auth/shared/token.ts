import jwt from "jsonwebtoken";
import { env } from "@/lib/api/env";

export interface TokenPayload {
  sub: string;
  role: "admin" | "user";
}

export function signAuthToken(payload: TokenPayload): string {
  const expiresIn = env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"];

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
  });
}

export function verifyAuthToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid token payload.");
  }

  const sub = "sub" in decoded ? decoded.sub : null;
  const role = "role" in decoded ? decoded.role : null;

  if (typeof sub !== "string" || (role !== "admin" && role !== "user")) {
    throw new Error("Invalid token payload.");
  }

  return { sub, role };
}
