"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Flame,
  Zap,
  Settings,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Lock,
  Trophy,
  User,
  LogOut,
  ChevronDown,
  Compass,
} from "lucide-react";
import { C } from "@/lib/constants";
import { useAppState } from "@/hooks/useAppState";
import { Dashboard } from "@/components/feature/dashboard/Dashboard";
import { Curriculum } from "@/components/feature/curriculum/Curriculum";
import { Schedule } from "@/components/feature/schedule/Schedule";
import { LockIn } from "@/components/feature/studymode/LockIn";
import { Achievements } from "@/components/feature/achievements/Achievements";
import { SettingsPanel } from "@/components/feature/settings/SettingsPanel";
import { AppState, Subject } from "@/lib/types";
import {
  clearAuthSession,
  readAuthSession,
  StoredAuthSession,
} from "@/lib/auth-client";
import {
  buildAppStateFromCurriculumData,
  extractRawCurriculumFromAppState,
  syncUserStateFromServer,
} from "@/lib/curriculum-state";
import { getAdminCurriculum, updateAdminCurriculum } from "@/lib/admin-client";
import { runBackupNow } from "@/lib/backup-client";
import { idbGet, idbSet } from "@/lib/db";

export default function StudyTracker() {
  const router = useRouter();
  const [reviewCurriculumId, setReviewCurriculumId] = useState<string | null>(null);
  const [urlReady, setUrlReady] = useState(false);
  const { state, update, loaded, importState } = useAppState();
  const [view, setView] = useState("dashboard");
  const [lockinSub, setLockinSub] = useState<Subject | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [adminReviewTitle, setAdminReviewTitle] = useState("");
  const [adminReviewSaving, setAdminReviewSaving] = useState(false);
  const [adminReviewStatus, setAdminReviewStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSyncedCurriculumRef = useRef(false);
  const hasLoadedReviewRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setReviewCurriculumId(params.get("reviewCurriculumId"));
    setUrlReady(true);
  }, []);

  useEffect(() => {
    hasLoadedReviewRef.current = false;
  }, [reviewCurriculumId]);

  useEffect(() => {
    hasSyncedCurriculumRef.current = false;
  }, [session?.user.id]);

  const navigate = (v: string, data?: unknown) => {
    if (v === "lockin" && data) setLockinSub(data as Subject);
    setView(v);
  };

  useEffect(() => {
    if (!urlReady) {
      return;
    }

    const current = readAuthSession();
    if (!current) {
      clearAuthSession();
      router.replace("/login");
      setAuthReady(true);
      return;
    }

    if (current.user.role === "admin") {
      if (!reviewCurriculumId) {
        router.replace("/admin/dashboard");
        setAuthReady(true);
        return;
      }

      setSession(current);
      setView("curriculum");
      setAuthReady(true);
      return;
    }

    setSession(current);
    setAuthReady(true);
  }, [router, reviewCurriculumId, urlReady]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (
      !session ||
      session.user.role !== "user" ||
      !loaded ||
      hasSyncedCurriculumRef.current
    ) {
      return;
    }

    hasSyncedCurriculumRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const localRaw = await idbGet("state");
        const localState =
          typeof localRaw === "string"
            ? JSON.parse(localRaw)
            : localRaw;
        const expectedCurriculumId = session.user.selectedCurriculumId ?? null;
        const localCurriculumId =
          localState &&
          typeof localState === "object" &&
          typeof (localState as { curriculumId?: unknown }).curriculumId === "string"
            ? (localState as { curriculumId: string }).curriculumId
            : null;
        const localOwnerUserId =
          localState &&
          typeof localState === "object" &&
          typeof (localState as { ownerUserId?: unknown }).ownerUserId === "string"
            ? (localState as { ownerUserId: string }).ownerUserId
            : null;
        const curriculumMatches =
          expectedCurriculumId !== null && localCurriculumId === expectedCurriculumId;

        if (
          curriculumMatches &&
          (localOwnerUserId === session.user.id || localOwnerUserId === null)
        ) {
          if (
            localOwnerUserId === null &&
            localState &&
            typeof localState === "object"
          ) {
            await importState(
              {
                ...(localState as Record<string, unknown>),
                ownerUserId: session.user.id,
              } as Partial<AppState>,
              { markBackupPending: false },
            );
          }
          return;
        }

        const synced = await syncUserStateFromServer({
          ownerUserId: session.user.id,
        });
        if (!cancelled && synced) {
          await importState(synced, { markBackupPending: false });
        }
      } catch {
        // Keep local state if server sync fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, loaded, importState]);

  useEffect(() => {
    if (
      !session ||
      session.user.role !== "admin" ||
      !reviewCurriculumId ||
      !loaded ||
      hasLoadedReviewRef.current
    ) {
      return;
    }

    hasLoadedReviewRef.current = true;
    setAdminReviewStatus(null);

    (async () => {
      try {
        const details = await getAdminCurriculum(reviewCurriculumId);
        setAdminReviewTitle(details.item.title);
        const reviewState = buildAppStateFromCurriculumData(
          details.item.id,
          details.activeVersion.data,
          null,
        );
        await importState(reviewState, { markBackupPending: false });
        setView("curriculum");
      } catch (error) {
        setAdminReviewStatus({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Failed to load curriculum review.",
        });
      }
    })();
  }, [session, reviewCurriculumId, loaded, importState]);

  useEffect(() => {
    if (
      !session ||
      session.user.role !== "user" ||
      !loaded
    ) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const flushPendingBackup = async () => {
      if (cancelled || inFlight) {
        return;
      }
      inFlight = true;
      try {
        const backupPending = await idbGet("backup.pending");
        if (backupPending !== "1") {
          return;
        }

        const raw = await idbGet("state");
        if (!raw) {
          return;
        }

        const parsedState = typeof raw === "string" ? JSON.parse(raw) : raw;
        await runBackupNow(parsedState);
        await idbSet("backup.pending", "0");
      } catch {
        // Auto backup is best-effort and should not block app usage.
      } finally {
        inFlight = false;
      }
    };

    void flushPendingBackup();
    const intervalId = window.setInterval(() => {
      void flushPendingBackup();
    }, 30_000);

    const onFocus = () => {
      void flushPendingBackup();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void flushPendingBackup();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [session, loaded]);

  const NAV = [
    { id: "dashboard", icon: <LayoutDashboard size={17} />, label: "Home" },
    { id: "curriculum", icon: <BookOpen size={17} />, label: "Curriculum" },
    { id: "schedule", icon: <Calendar size={17} />, label: "Schedule" },
    { id: "lockin", icon: <Lock size={17} />, label: "Lock-In" },
    { id: "achievements", icon: <Trophy size={17} />, label: "Awards" },
  ];

  const accountTitle = useMemo(() => {
    const raw = session?.user.username || session?.user.phone || "User";
    return raw;
  }, [session]);

  const initials = useMemo(() => {
    const words = accountTitle.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return "U";
    }

    if (words.length === 1) {
      return words[0].slice(0, 1).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }, [accountTitle]);

  async function saveAdminReviewVersion() {
    if (!session || session.user.role !== "admin" || !reviewCurriculumId) {
      return;
    }

    setAdminReviewSaving(true);
    setAdminReviewStatus(null);

    try {
      await updateAdminCurriculum(reviewCurriculumId, {
        title: adminReviewTitle.trim() || "Untitled Curriculum",
        data: extractRawCurriculumFromAppState(state),
      });
      setAdminReviewStatus({
        type: "success",
        text: "Saved as a new curriculum version.",
      });
    } catch (error) {
      setAdminReviewStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to save curriculum changes.",
      });
    } finally {
      setAdminReviewSaving(false);
    }
  }

  const isAdminReviewMode =
    session?.user.role === "admin" && Boolean(reviewCurriculumId);

  if (!loaded || !authReady)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles size={30} style={{ color: C.accent }} />
        </motion.div>
        <div style={{ color: C.muted, fontSize: 12, fontWeight: 600 }}>
          Loading StudyFlow...
        </div>
      </div>
    );

  if (!session) {
    return null;
  }

  if (isAdminReviewMode) {
    return (
      <AdminReviewWorkspace
        state={state}
        update={update}
        title={adminReviewTitle}
        setTitle={setAdminReviewTitle}
        saving={adminReviewSaving}
        status={adminReviewStatus}
        onSave={() => void saveAdminReviewVersion()}
        onBack={() => router.push("/admin/dashboard")}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans','Trebuchet MS',system-ui,sans-serif",
        color: C.text,
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity }}
          style={{
            position: "absolute",
            top: "5%",
            left: "10%",
            width: 500,
            height: 500,
            background: `radial-gradient(circle,${C.accent}07,transparent 60%)`,
            borderRadius: "50%",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, delay: 3 }}
          style={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            width: 400,
            height: 400,
            background: `radial-gradient(circle,${C.indigo}07,transparent 60%)`,
            borderRadius: "50%",
          }}
        />
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={`spark-${i}`}
            initial={{ opacity: 0.12 }}
            animate={{ opacity: [0.08, 0.25, 0.08], y: [0, -8, 0] }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.2,
            }}
            style={{
              position: "absolute",
              top: `${8 + (i * 7) % 80}%`,
              left: `${6 + (i * 11) % 88}%`,
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: i % 2 === 0 ? C.accent : C.indigo,
            }}
          />
        ))}
      </div>

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `${C.surface}e8`,
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "11px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <motion.div
            whileHover={{ rotate: 20, scale: 1.1 }}
            style={{
              width: 28,
              height: 28,
              background: `linear-gradient(135deg,${C.accent},#f97316)`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={13} style={{ color: "#000" }} />
          </motion.div>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              background: `linear-gradient(90deg,${C.accent},${C.indigo})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            StudyFlow
            <p style={{ fontSize: 7 }}>By M.JOU</p>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: `${C.accent}1a`,
              border: `1px solid ${C.accent}44`,
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "default",
            }}
          >
            <Flame size={12} style={{ color: C.accent }} />
            <span style={{ color: C.accent, fontWeight: 800, fontSize: 12 }}>
              {state.streak}
            </span>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: `${C.indigo}1a`,
              border: `1px solid ${C.indigo}44`,
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "default",
            }}
          >
            <Zap size={12} style={{ color: C.indigo }} />
            <span style={{ color: C.indigo, fontWeight: 800, fontSize: 12 }}>
              {state.xp}
            </span>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowSettings(true)}
            style={{
              background: C.ghost,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "5px 7px",
              cursor: "pointer",
              color: C.muted,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Settings size={14} />
          </motion.button>

          <div ref={menuRef} style={{ position: "relative" }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowAccountMenu((prev) => !prev)}
              style={{
                borderRadius: 999,
                border: `1px solid ${C.indigo}44`,
                background: `${C.indigo}14`,
                color: C.indigo,
                padding: "3px 8px 3px 3px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  background: `linear-gradient(135deg, ${C.indigo}, ${C.accent})`,
                  color: "#fff",
                }}
              >
                {initials}
              </span>
              <ChevronDown size={13} />
            </motion.button>

            <AnimatePresence>
              {showAccountMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: 220,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 8,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
                    zIndex: 200,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 10px",
                      borderBottom: `1px solid ${C.border}`,
                      marginBottom: 6,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 12 }}>
                      {accountTitle}
                    </p>
                    <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 11 }}>
                      Route control
                    </p>
                  </div>

                  <MenuItem
                    icon={<User size={14} />}
                    label="Profile"
                    onClick={() => {
                      setShowAccountMenu(false);
                      router.push("/profile");
                    }}
                  />
                  <MenuItem
                    icon={<Compass size={14} />}
                    label="Login Page"
                    onClick={() => {
                      setShowAccountMenu(false);
                      router.push("/login");
                    }}
                  />
                  <MenuItem
                    icon={<LogOut size={14} />}
                    label="Logout"
                    danger
                    onClick={() => {
                      clearAuthSession();
                      setShowAccountMenu(false);
                      router.push("/login");
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 520,
          margin: "0 auto",
          padding: "18px 15px 96px",
        }}
      >
        <AnimatePresence mode="wait">
          {view === "dashboard" && (
            <Dashboard
              key="d"
              state={state}
              update={update}
              setView={navigate}
            />
          )}
          {view === "curriculum" && (
            <Curriculum key="c" state={state} update={update} />
          )}
          {view === "schedule" && (
            <Schedule key="s" state={state} setView={navigate} />
          )}
          {view === "lockin" && (
            <LockIn
              key="l"
              state={state}
              update={update}
              defaultSubject={lockinSub}
            />
          )}
          {view === "achievements" && <Achievements key="a" state={state} />}
        </AnimatePresence>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: `${C.surface}f4`,
          backdropFilter: "blur(16px)",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "9px 4px 13px",
          zIndex: 50,
        }}
      >
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <motion.button
              key={n.id}
              onClick={() => navigate(n.id)}
              whileTap={{ scale: 0.88 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: active ? `${C.accent}18` : "transparent",
                border: "none",
                cursor: "pointer",
                padding: "5px 12px",
                borderRadius: 12,
              }}
            >
              <motion.span
                animate={active ? { y: [-3, 0] } : {}}
                transition={{ type: "spring", stiffness: 500 }}
                style={{ color: active ? C.accent : C.muted }}
              >
                {n.icon}
              </motion.span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: active ? 800 : 500,
                  color: active ? C.accent : C.muted,
                  letterSpacing: 0.3,
                }}
              >
                {n.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            state={state}
            importState={importState}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "transparent",
        border: "none",
        borderRadius: 10,
        padding: "8px 10px",
        color: danger ? C.red : C.text,
        fontWeight: 700,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {icon}
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  );
}

function AdminReviewWorkspace({
  state,
  update,
  title,
  setTitle,
  saving,
  status,
  onSave,
  onBack,
}: {
  state: AppState;
  update: (updater: Partial<AppState> | ((prev: AppState) => AppState)) => void;
  title: string;
  setTitle: (value: string) => void;
  saving: boolean;
  status: { type: "success" | "error"; text: string } | null;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(245,158,11,0.16), transparent 35%), radial-gradient(circle at 95% 5%, rgba(129,140,248,0.2), transparent 42%), #050508",
        color: C.text,
        fontFamily: "'DM Sans','Trebuchet MS',system-ui,sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(12,12,20,0.92)",
          backdropFilter: "blur(10px)",
          padding: "10px 12px",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onBack} style={reviewGhostButton}>
            <ArrowLeft size={13} /> Admin Dashboard
          </button>
          <div style={{ marginLeft: "auto", color: C.muted, fontSize: 12 }}>
            Admin Review Mode
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8 }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Curriculum title"
            style={{
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.ghost,
              color: C.text,
              padding: "10px 11px",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={onSave}
            style={{
              borderRadius: 10,
              border: `1px solid ${C.accent}66`,
              background: C.accent,
              color: "#0b0b0f",
              padding: "10px 14px",
              fontWeight: 900,
              cursor: saving ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <CheckCircle2 size={14} />
            {saving ? "Saving..." : "Save Upgrade"}
          </button>
        </div>
        {status && (
          <div
            style={{
              borderRadius: 9,
              border: `1px solid ${status.type === "success" ? `${C.green}55` : `${C.red}55`}`,
              background: status.type === "success" ? `${C.green}1a` : `${C.red}1a`,
              color: status.type === "success" ? C.green : C.red,
              padding: "8px 10px",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {status.text}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "16px 14px 20px" }}>
        <Curriculum state={state} update={update} />
      </div>
    </div>
  );
}

const reviewGhostButton: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.ghost,
  color: C.text,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};
