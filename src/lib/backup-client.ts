import { apiRequest } from "@/lib/auth-client";

export type BackupFrequency = "daily" | "weekly" | "monthly";

export interface BackupHistoryItem {
  id: string;
  createdAt: string;
  bytes: number;
  compression?: "none" | "gzip";
}

export interface BackupProfileResponse {
  settings: {
    userId: string;
    frequency: BackupFrequency;
    updatedAt: string;
  };
  latestBackup: BackupHistoryItem | null;
  history: BackupHistoryItem[];
  dueNow: boolean;
}

export interface LatestBackupResponse {
  backup: {
    id: string;
    createdAt: string;
    state: unknown;
  } | null;
}

export function getBackupProfile() {
  return apiRequest<BackupProfileResponse>("/backups/profile");
}

export function updateBackupSettings(frequency: BackupFrequency) {
  return apiRequest<{ settings: BackupProfileResponse["settings"] }>("/backups/settings", {
    method: "PUT",
    body: JSON.stringify({ frequency }),
  });
}

export function runBackupNow(state: unknown) {
  return apiRequest<{ item: BackupHistoryItem; stored: boolean; deduped: boolean }>(
    "/backups/run",
    {
      method: "POST",
      body: JSON.stringify({ state }),
    },
  );
}

export function getLatestBackup() {
  return apiRequest<LatestBackupResponse>("/backups/latest");
}
