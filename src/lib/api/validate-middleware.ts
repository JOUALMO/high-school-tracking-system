import { z, ZodTypeAny } from "zod";
import { HttpError } from "@/lib/api/http-error";

export function validateBody<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(", ");
    throw new HttpError(400, message);
  }

  return parsed.data;
}
