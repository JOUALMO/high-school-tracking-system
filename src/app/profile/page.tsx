"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CloudUpload,
  Database,
  History,
  LogOut,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { C } from "@/lib/constants";
import { idbGet, idbSet } from "@/lib/db";
import {
  clearAuthSession,
  readAuthSession,
  StoredAuthSession,
} from "@/lib/auth-client";
import {
  BackupFrequency,
  BackupProfileResponse,
  getBackupProfile,
  runBackupNow,
  updateBackupSettings,
} from "@/lib/backup-client";

const FREQUENCIES: BackupFrequency[] = ["daily", "weekly", "monthly"];

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [frequency, setFrequency] = useState<BackupFrequency>("weekly");
  const [profile, setProfile] = useState<BackupProfileResponse | null>(null);
  const [savingFrequency, setSavingFrequency] = useState<BackupFrequency | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    const current = readAuthSession();
    if (!current || current.user.role !== "user") {
      clearAuthSession();
      router.replace("/login");
      return;
    }
    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    (async () => {
      setLoading(true);
      setMessage(null);
      try {
        const data = await getBackupProfile();
        setProfile(data);
        setFrequency(data.settings.frequency);
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Failed to load backup profile.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  async function changeFrequency(next: BackupFrequency) {
    if (next === frequency || savingFrequency) {
      return;
    }

    setSavingFrequency(next);
    setMessage(null);
    try {
      await updateBackupSettings(next);
      setFrequency(next);
      const refreshed = await getBackupProfile();
      setProfile(refreshed);
      setMessage({ type: "success", text: `Auto backup set to ${next}.` });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to update backup setting.",
      });
    } finally {
      setSavingFrequency(null);
    }
  }

  async function executeBackupNow() {
    if (backupRunning) {
      return;
    }

    setBackupRunning(true);
    setBackupProgress(8);
    setMessage(null);

    try {
      const raw = await idbGet("state");
      setBackupProgress(32);

      if (!raw) {
        throw new Error("No local study data found to backup.");
      }

      const parsedState = typeof raw === "string" ? JSON.parse(raw) : raw;
      setBackupProgress(65);

      const result = await runBackupNow(parsedState);
      await idbSet("backup.pending", "0");
      setBackupProgress(100);

      const refreshed = await getBackupProfile();
      setProfile(refreshed);
      setFrequency(refreshed.settings.frequency);
      setMessage({
        type: "success",
        text: result.stored
          ? "Backup completed and stored on the server."
          : "No changes since last backup. Existing backup kept.",
      });
    } catch (error) {
      setBackupProgress(0);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Backup failed. Please try again.",
      });
    } finally {
      setBackupRunning(false);
    }
  }

  const initials = useMemo(() => {
    const name = session?.user.username || session?.user.phone || "U";
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 1).toUpperCase();
    }
    return `${words[0]?.[0] ?? "U"}${words[1]?.[0] ?? ""}`.toUpperCase();
  }, [session]);

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.bg,
          color: C.muted,
        }}
      >
        Loading profile...
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 15% 15%, rgba(52,211,153,0.12), transparent 35%), radial-gradient(circle at 90% 5%, rgba(129,140,248,0.16), transparent 40%), #050508",
        color: C.text,
        padding: 16,
      }}
    >
      <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 14 }}>
        <header
          style={{
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: "rgba(12,12,20,0.9)",
            backdropFilter: "blur(10px)",
            padding: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <button type="button" onClick={() => router.push("/")} style={ghostButton}>
            <ArrowLeft size={14} /> Back To App
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.indigo}, ${C.accent})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{session.user.username || "Student"}</div>
              <div style={{ color: C.muted, fontSize: 11 }}>{session.user.phone || "-"}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              router.push("/login");
            }}
            style={{ ...ghostButton, borderColor: `${C.red}66`, color: C.red }}
          >
            <LogOut size={14} /> Logout
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          <StatCard
            icon={<ShieldCheck size={14} />}
            label="Account Role"
            value={session.user.role.toUpperCase()}
          />
          <StatCard
            icon={<Database size={14} />}
            label="Auto Backup"
            value={frequency}
          />
          <StatCard
            icon={<History size={14} />}
            label="Last Backup"
            value={
              profile?.latestBackup
                ? new Date(profile.latestBackup.createdAt).toLocaleString()
                : "Not yet"
            }
          />
        </section>

        <section
          style={{
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: "rgba(12,12,20,0.92)",
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Backup Control Center</h1>
            <p style={{ margin: "6px 0 0", color: C.muted, fontSize: 13 }}>
              Configure daily/weekly/monthly backups and run instant backup safely.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FREQUENCIES.map((item) => {
              const active = frequency === item;
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!!savingFrequency}
                  onClick={() => void changeFrequency(item)}
                  style={{
                    borderRadius: 999,
                    border: `1px solid ${active ? `${C.indigo}66` : C.border}`,
                    background: active ? `${C.indigo}1f` : C.ghost,
                    color: active ? C.indigo : C.text,
                    padding: "7px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {savingFrequency === item ? "Saving..." : item}
                </button>
              );
            })}
          </div>

          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.ghost,
              padding: 12,
              display: "grid",
              gap: 9,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.muted, fontSize: 12 }}>
                {profile?.dueNow ? "Backup is due now" : "Backup schedule is healthy"}
              </span>
              <span style={{ color: C.muted, fontSize: 12 }}>{backupProgress}%</span>
            </div>
            <div
              style={{
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                background: "#0f1320",
                height: 9,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${backupProgress}%` }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{
                  height: "100%",
                  width: "0%",
                  background: "linear-gradient(90deg, #34d399, #818cf8)",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void executeBackupNow()}
              disabled={backupRunning || loading}
              style={{
                borderRadius: 10,
                border: `1px solid ${C.accent}66`,
                background: C.accent,
                color: "#0a0d14",
                padding: "10px 12px",
                fontWeight: 900,
                fontSize: 13,
                cursor: backupRunning ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <CloudUpload size={14} />
              {backupRunning ? "Creating Backup..." : "Backup Now"}
            </button>
          </div>

          {message && (
            <div
              style={{
                borderRadius: 10,
                border: `1px solid ${message.type === "success" ? `${C.green}50` : `${C.red}50`}`,
                background: message.type === "success" ? `${C.green}18` : `${C.red}18`,
                color: message.type === "success" ? C.green : C.red,
                padding: "9px 11px",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              {message.type === "error" && <TriangleAlert size={14} />}
              {message.text}
            </div>
          )}
        </section>

        <section
          style={{
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: "rgba(12,12,20,0.92)",
            padding: 16,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 14 }}>Recent Backups</h3>
          {loading && <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>Loading backups...</p>}
          {!loading && (profile?.history.length ?? 0) === 0 && (
            <p style={{ margin: 0, color: C.muted, fontSize: 12 }}>
              No backups yet. Run your first backup now.
            </p>
          )}
          {!loading && (profile?.history.length ?? 0) > 0 && (
            <div style={{ display: "grid", gap: 7 }}>
              {profile!.history.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: C.ghost,
                    padding: "8px 10px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: C.text }}>{new Date(item.createdAt).toLocaleString()}</span>
                  <span style={{ color: C.muted }}>{formatBytes(item.bytes)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        background: "rgba(12,12,20,0.88)",
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, fontSize: 11 }}>
        {icon}
        {label}
      </div>
      <div style={{ marginTop: 4, fontWeight: 800, fontSize: 13, textTransform: "capitalize" }}>{value}</div>
    </div>
  );
}

const ghostButton: CSSProperties = {
  background: C.ghost,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "8px 11px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontWeight: 700,
};

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}
