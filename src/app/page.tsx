"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Flame,
  Zap,
  Settings,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Lock,
  Trophy,
} from "lucide-react";
import { C } from "@/lib/constants";
import { useAppState } from "@/hooks/useAppState";
import { Dashboard } from "@/components/feature/dashboard/Dashboard";
import { Curriculum } from "@/components/feature/curriculum/Curriculum";
import { Schedule } from "@/components/feature/schedule/Schedule";
import { LockIn } from "@/components/feature/studymode/LockIn";
import { Achievements } from "@/components/feature/achievements/Achievements";
import { SettingsPanel } from "@/components/feature/settings/SettingsPanel";
import { Subject } from "@/lib/types";

export default function StudyTracker() {
  const { state, update, loaded, importState } = useAppState();
  const [view, setView] = useState("dashboard");
  const [lockinSub, setLockinSub] = useState<Subject | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const navigate = (v: string, data?: any) => {
    if (v === "lockin" && data) setLockinSub(data);
    setView(v);
  };

  const NAV = [
    { id: "dashboard", icon: <LayoutDashboard size={17} />, label: "Home" },
    { id: "curriculum", icon: <BookOpen size={17} />, label: "Curriculum" },
    { id: "schedule", icon: <Calendar size={17} />, label: "Schedule" },
    { id: "lockin", icon: <Lock size={17} />, label: "Lock-In" },
    { id: "achievements", icon: <Trophy size={17} />, label: "Awards" },
  ];

  if (!loaded)
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'DM Sans','Trebuchet MS',system-ui,sans-serif",
        color: C.text,
      }}
    >
      {/* Ambient glows */}
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
      </div>

      {/* Topbar */}
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
        </div>
      </div>

      {/* Pages */}
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

      {/* Bottom Nav */}
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

      {/* Settings Modal */}
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
