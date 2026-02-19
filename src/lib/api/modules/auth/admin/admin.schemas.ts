import { z } from "zod";
import { normalizeEmail } from "../shared/normalize";

export const adminSignupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().email().transform(normalizeEmail),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    accessPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password and confirm password do not match.",
    path: ["confirmPassword"],
  });

export const adminLoginSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1).max(128),
});

export type AdminSignupInput = z.infer<typeof adminSignupSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
