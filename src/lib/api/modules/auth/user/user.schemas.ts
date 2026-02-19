import { z } from "zod";
import { normalizePhone } from "../shared/normalize";

function hasEnoughDigits(phone: string): boolean {
  const digits = phone.startsWith("+") ? phone.slice(1) : phone;
  return digits.length >= 10 && digits.length <= 12 && /^\d+$/.test(digits);
}

export const userSignupSchema = z
  .object({
    username: z.string().trim().min(2).max(80),
    phone: z.string().min(10).max(12).transform(normalizePhone),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    curriculumId: z.string().trim().min(1),
  })
  .refine((data) => hasEnoughDigits(data.phone), {
    message: "يرجي ادخال رقم هاتف صحيح",
    path: ["phone"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "يجب أن تكون كلمة المرور متطابقة",
    path: ["confirmPassword"],
  });

export const userLoginSchema = z
  .object({
    phone: z.string().min(10).max(12).transform(normalizePhone),
    password: z.string().min(1).max(128),
  })
  .refine((data) => hasEnoughDigits(data.phone), {
    message: "يرجي ادخال رقم هاتف صحيح",
    path: ["phone"],
  });

export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
