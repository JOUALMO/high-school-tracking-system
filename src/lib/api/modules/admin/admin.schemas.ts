import { z } from "zod";

export const createCurriculumSchema = z.object({
  title: z.string().trim().min(3).max(120),
  data: z.unknown(),
});

export const updateCurriculumStatusSchema = z.object({
  status: z.enum(["draft", "published"]),
});

export const updateCurriculumSchema = z.object({
  title: z.string().trim().min(3).max(120),
  data: z.unknown(),
});

export type CreateCurriculumInput = z.infer<typeof createCurriculumSchema>;
export type UpdateCurriculumStatusInput = z.infer<typeof updateCurriculumStatusSchema>;
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumSchema>;
