import { z } from "zod";

const appStateShape = z
  .object({
    subjects: z.array(z.unknown()),
  })
  .passthrough();

export const backupFrequencySchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

export const runBackupSchema = z.object({
  state: appStateShape,
});

export type BackupFrequencyInput = z.infer<typeof backupFrequencySchema>;
export type RunBackupInput = z.infer<typeof runBackupSchema>;
