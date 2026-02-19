import { NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/api/error-handler";

export interface RouteContext<TParams extends object = Record<string, string>> {
  params: Promise<TParams>;
}

const defaultContext = {
  params: Promise.resolve({}),
} as RouteContext;

export function asyncHandler<TParams extends object = Record<string, string>>(
  handler: (
    req: NextRequest,
    context: RouteContext<TParams>,
  ) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context?: RouteContext<TParams>) => {
    try {
      return await handler(req, context ?? (defaultContext as RouteContext<TParams>));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
