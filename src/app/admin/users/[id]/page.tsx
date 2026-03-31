"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Lock,
  Trophy,
  Phone,
  Clock,
  User,
  Sparkles,
  AlertCircle
} from "lucide-react";

import { C } from "@/lib/constants";
import { Dashboard } from "@/components/feature/dashboard/Dashboard";
import { Curriculum } from "@/components/feature/curriculum/Curriculum";
import { Schedule } from "@/components/feature/schedule/Schedule";
import { LockIn } from "@/components/feature/studymode/LockIn";
import { Achievements } from "@/components/feature/achievements/Achievements";
import { AppState, Subject } from "@/lib/types";

import {
  getAdminUserProgress,
  getAdminUsers,
  AdminUserProgressResponse,
  AdminUsersResponse
} from "@/lib/admin-client";

export default function AdminUserProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [usersInfo, setUsersInfo] = useState<AdminUsersResponse["items"]>([]);
  const [progressData, setProgressData] = useState<AdminUserProgressResponse | null>(null);
  
  const [mockState, setMockState] = useState<AppState | null>(null);
  const [view, setView] = useState("dashboard");
  const [lockinSub, setLockinSub] = useState<Subject | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, progressRes] = await Promise.all([
          getAdminUsers(),
          getAdminUserProgress(userId)
        ]);

        setUsersInfo(usersRes.items);
        setProgressData(progressRes);

        if (progressRes.state) {
          setMockState(progressRes.state);
        } else {
          // Provide an empty state so the admin can still view the app interface empty
          setMockState({
            ownerUserId: userId,
            xp: 0,
            streak: 0,
            completedToday: 0,
            lastActive: new Date().toISOString(),
            subjects: [],
            weeklyData: [],
            earnedBadges: [],
            curriculumId: null,
            curriculumVersion: null,
            curriculumSyncedAt: null,
            sessions: [],
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const currentUser = useMemo(() => {
    return usersInfo.find((u) => u.id === userId);
  }, [usersInfo, userId]);

  const { prevUser, nextUser } = useMemo(() => {
    if (!usersInfo.length) return { prevUser: null, nextUser: null };
    const currentIndex = usersInfo.findIndex((u) => u.id === userId);
    if (currentIndex === -1) return { prevUser: null, nextUser: null };
    
    return {
      prevUser: currentIndex > 0 ? usersInfo[currentIndex - 1] : null,
      nextUser: currentIndex < usersInfo.length - 1 ? usersInfo[currentIndex + 1] : null,
    };
  }, [usersInfo, userId]);

  // A dummy update function that only updates local React state so components don't crash and feel alive,
  // but we do not persist this back.
  const handleUpdateMockState = (updater: any) => {
    setMockState((prev) => {
      if (!prev) return prev;
      if (typeof updater === "function") {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  };

  const navigateView = (v: string, data?: unknown) => {
    if (v === "lockin" && data) setLockinSub(data as Subject);
    setView(v);
  };

  const NAV = [
    { id: "dashboard", icon: <LayoutDashboard size={17} />, label: "Home" },
    { id: "curriculum", icon: <BookOpen size={17} />, label: "Curriculum" },
    { id: "schedule", icon: <Calendar size={17} />, label: "Schedule" },
    { id: "lockin", icon: <Lock size={17} />, label: "Lock-In" },
    { id: "achievements", icon: <Trophy size={17} />, label: "Awards" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <Sparkles size={30} style={{ color: C.accent }} className="animate-spin" />
        <div style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Loading User Progress...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans','Trebuchet MS',system-ui,sans-serif", color: C.text }}>
      
      {/* ADMIN HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.surface}e8`, backdropFilter: "blur(14px)", borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        
        {/* Top Row: Back / Title / Next/Prev */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => router.push("/admin/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.indigo }}>Admin View</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={userId}
              onChange={(e) => router.push(`/admin/users/${(e.target as any).value}`)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: C.text,
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 12,
                outline: "none",
                maxWidth: 150,
              }}
            >
              <option disabled>Switch User...</option>
              {usersInfo.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => prevUser && router.push(`/admin/users/${prevUser.id}`)}
                disabled={!prevUser}
                title={prevUser ? `Previous: ${prevUser.username}` : ""}
                style={{ padding: "6px 8px", background: prevUser ? `${C.indigo}15` : "transparent", border: `1px solid ${prevUser ? C.indigo : C.border}44`, borderRadius: 8, color: prevUser ? C.indigo : C.muted, cursor: prevUser ? "pointer" : "not-allowed", display: "flex", alignItems: "center" }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => nextUser && router.push(`/admin/users/${nextUser.id}`)}
                disabled={!nextUser}
                title={nextUser ? `Next: ${nextUser.username}` : ""}
                style={{ padding: "6px 8px", background: nextUser ? `${C.indigo}15` : "transparent", border: `1px solid ${nextUser ? C.indigo : C.border}44`, borderRadius: 8, color: nextUser ? C.indigo : C.muted, cursor: nextUser ? "pointer" : "not-allowed", display: "flex", alignItems: "center" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: User Context */}
        {currentUser && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, background: C.ghost, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.text, fontWeight: 700 }}>
              <User size={12} style={{ color: C.accent }} /> {currentUser.username}
            </div>
            {currentUser.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
                <Phone size={12} /> {currentUser.phone}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
              <Clock size={12} /> Synced: {progressData?.backupAt ? new Date(progressData.backupAt).toLocaleString() : "Never"}
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "18px 15px 96px" }}>
        {error ? (
          <div style={{ textAlign: "center", color: C.red, padding: 40 }}>
            <AlertCircle size={40} style={{ margin: "0 auto 10px", opacity: 0.8 }} />
            <div style={{ fontWeight: 800 }}>Error</div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{error}</div>
          </div>
        ) : !mockState ? null : (
          <AnimatePresence mode="wait">
            {view === "dashboard" && (
              <Dashboard key="d" state={mockState} update={handleUpdateMockState} setView={navigateView} />
            )}
            {view === "curriculum" && (
              <Curriculum key="c" state={mockState} update={handleUpdateMockState} />
            )}
            {view === "schedule" && (
              <Schedule key="s" state={mockState} setView={navigateView} />
            )}
            {view === "lockin" && (
              <LockIn key="l" state={mockState} update={handleUpdateMockState} defaultSubject={lockinSub} />
            )}
            {view === "achievements" && (
              <Achievements key="a" state={mockState} />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* BOTTOM NAVIGATION (Mimics Student View) */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: `${C.surface}f4`, backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "9px 4px 13px", zIndex: 50 }}>
        {NAV.map((n) => {
          const active = view === n.id;
          return (
            <motion.button
              key={n.id}
              onClick={() => navigateView(n.id)}
              whileTap={{ scale: 0.88 }}
              disabled={!mockState}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: active ? `${C.accent}18` : "transparent",
                border: "none",
                cursor: mockState ? "pointer" : "not-allowed",
                opacity: mockState ? 1 : 0.5,
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
              <span style={{ fontSize: 9, fontWeight: active ? 800 : 500, color: active ? C.accent : C.muted, letterSpacing: 0.3 }}>
                {n.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
