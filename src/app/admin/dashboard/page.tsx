"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  Eye,
  FilePenLine,
  LogOut,
  Trash2,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { C } from "@/lib/constants";
import {
  clearAuthSession,
  readAuthSession,
  StoredAuthSession,
} from "@/lib/auth-client";
import {
  createAdminCurriculum,
  deleteAdminCurriculum,
  getAdminCurriculum,
  getAdminCurricula,
  getAdminOverview,
  getAdminUsers,
  updateAdminCurriculum,
  updateAdminCurriculumStatus,
  AdminCurriculaResponse,
  AdminCurriculumDetailsResponse,
  AdminOverviewResponse,
  AdminUsersResponse,
} from "@/lib/admin-client";

type AdminTab = "overview" | "users" | "curricula" | "system";

const TABS: Array<{ id: AdminTab; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
  { id: "users", label: "Users", icon: <Users size={16} /> },
  { id: "curricula", label: "Curricula", icon: <BookOpen size={16} /> },
  { id: "system", label: "System", icon: <Settings size={16} /> },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [users, setUsers] = useState<AdminUsersResponse["items"]>([]);
  const [curricula, setCurricula] = useState<AdminCurriculaResponse["items"]>([]);

  const [search, setSearch] = useState("");
  const [newCurriculumTitle, setNewCurriculumTitle] = useState("");
  const [newCurriculumJson, setNewCurriculumJson] = useState("{\n  \"subjects\": []\n}");
  const [creatingCurriculum, setCreatingCurriculum] = useState(false);
  const [editingCurriculumId, setEditingCurriculumId] = useState<string | null>(null);
  const [editingCurriculumTitle, setEditingCurriculumTitle] = useState("");
  const [editingCurriculumJson, setEditingCurriculumJson] = useState("");
  const [reviewData, setReviewData] = useState<AdminCurriculumDetailsResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [deletingCurriculumId, setDeletingCurriculumId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const current = readAuthSession();
    if (!current || current.user.role !== "admin") {
      clearAuthSession();
      router.replace("/admin/login");
      return;
    }

    setSession(current);
  }, [router]);

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshData();
  }, [session]);

  useEffect(() => {
    const updateCompact = () => setCompact(window.innerWidth < 960);
    updateCompact();
    window.addEventListener("resize", updateCompact);
    return () => window.removeEventListener("resize", updateCompact);
  }, []);

  async function refreshData() {
    setLoading(true);
    setMessage(null);

    try {
      const [overviewData, usersData, curriculaData] = await Promise.all([
        getAdminOverview(),
        getAdminUsers(),
        getAdminCurricula(),
      ]);
      setOverview(overviewData);
      setUsers(usersData.items);
      setCurricula(curriculaData.items);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to load admin data.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCurriculum() {
    setMessage(null);
    setCreatingCurriculum(true);

    try {
      const parsed = JSON.parse(newCurriculumJson);
      await createAdminCurriculum({
        title: newCurriculumTitle,
        data: parsed,
      });

      setMessage({ type: "success", text: "Curriculum created in draft mode." });
      setNewCurriculumTitle("");
      await refreshData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not create curriculum.",
      });
    } finally {
      setCreatingCurriculum(false);
    }
  }

  async function toggleCurriculumStatus(
    curriculumId: string,
    currentStatus: "draft" | "published",
  ) {
    setMessage(null);

    try {
      const nextStatus = currentStatus === "draft" ? "published" : "draft";
      await updateAdminCurriculumStatus(curriculumId, nextStatus);
      setMessage({
        type: "success",
        text: `Curriculum moved to ${nextStatus}.`,
      });
      await refreshData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Unable to update curriculum.",
      });
    }
  }

  async function loadCurriculumForReview(curriculumId: string) {
    router.push(`/?reviewCurriculumId=${encodeURIComponent(curriculumId)}`);
  }

  async function saveCurriculumChanges() {
    if (!editingCurriculumId) {
      return;
    }

    setMessage(null);
    setSavingCurriculum(true);

    try {
      const parsed = JSON.parse(editingCurriculumJson);
      await updateAdminCurriculum(editingCurriculumId, {
        title: editingCurriculumTitle,
        data: parsed,
      });
      setMessage({ type: "success", text: "Curriculum updated successfully." });
      await refreshData();
      await loadCurriculumForReview(editingCurriculumId);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to update curriculum.",
      });
    } finally {
      setSavingCurriculum(false);
    }
  }

  async function removeCurriculum(curriculumId: string, title: string) {
    const accepted = window.confirm(
      `Delete "${title}" and all of its versions? This cannot be undone.`,
    );
    if (!accepted) {
      return;
    }

    setMessage(null);
    setDeletingCurriculumId(curriculumId);

    try {
      await deleteAdminCurriculum(curriculumId);
      setMessage({ type: "success", text: "Curriculum deleted." });
      if (editingCurriculumId === curriculumId) {
        setEditingCurriculumId(null);
        setEditingCurriculumTitle("");
        setEditingCurriculumJson("");
        setReviewData(null);
      }
      await refreshData();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to delete curriculum.",
      });
    } finally {
      setDeletingCurriculumId(null);
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(q) ||
        user.phone.toLowerCase().includes(q) ||
        (user.selectedCurriculumId || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

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
        Checking admin session...
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        padding: 16,
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
          animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 9, repeat: Infinity }}
          style={{
            position: "absolute",
            top: -70,
            right: -50,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.indigo}30, transparent 70%)`,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 11, repeat: Infinity }}
          style={{
            position: "absolute",
            left: -120,
            bottom: -110,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.accent}2a, transparent 70%)`,
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1220,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr"
            : "minmax(230px, 260px) minmax(0, 1fr)",
          gap: 14,
        }}
      >
        <aside
          style={{
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: `${C.surface}f0`,
            backdropFilter: "blur(12px)",
            padding: 12,
            height: compact ? "auto" : "calc(100vh - 32px)",
            position: compact ? "static" : "sticky",
            top: compact ? undefined : 16,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${C.border}`,
              background: C.ghost,
              padding: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 11, color: C.muted }}>Admin Console</div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{session.user.name || "Admin"}</div>
            <div style={{ fontSize: 12, color: C.indigo }}>{session.user.email || "admin@local"}</div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 6,
              marginBottom: 10,
              gridTemplateColumns: compact ? "repeat(auto-fit, minmax(140px, 1fr))" : undefined,
            }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    border: `1px solid ${active ? `${C.indigo}66` : C.border}`,
                    background: active ? `${C.indigo}1f` : C.ghost,
                    color: active ? C.indigo : C.text,
                    borderRadius: 10,
                    padding: "9px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {tab.icon}
                    {tab.label}
                  </span>
                  {tab.id === "users" && (
                    <span style={{ color: C.muted, fontSize: 11 }}>{users.length}</span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void refreshData()}
            style={{
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.ghost,
              color: C.text,
              padding: "9px 10px",
              fontWeight: 700,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            <RefreshCw size={14} /> Refresh data
          </button>

          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              router.push("/admin/login");
            }}
            style={{
              marginTop: compact ? 0 : "auto",
              borderRadius: 10,
              border: `1px solid ${C.red}44`,
              background: `${C.red}18`,
              color: C.red,
              padding: "9px 10px",
              fontWeight: 700,
              fontSize: 13,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </aside>

        <section
          style={{
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: `${C.surface}ef`,
            padding: 14,
            minHeight: "calc(100vh - 32px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: 23, fontWeight: 900 }}>Admin Dashboard</h1>
              <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
                Manage users, publish curricula, and monitor platform health.
              </p>
            </div>
            <div
              style={{
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                padding: "7px 10px",
                background: C.ghost,
                color: C.muted,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Activity size={13} />
              {loading ? "Syncing..." : "Synced"}
            </div>
          </div>

          {message && (
            <div
              style={{
                marginBottom: 10,
                borderRadius: 10,
                border: `1px solid ${message.type === "success" ? `${C.green}45` : `${C.red}45`}`,
                background: message.type === "success" ? `${C.green}15` : `${C.red}15`,
                color: message.type === "success" ? C.green : C.red,
                padding: "9px 11px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {message.text}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && (
                <OverviewTab overview={overview} loading={loading} />
              )}
              {activeTab === "users" && (
                <UsersTab
                  users={filteredUsers}
                  search={search}
                  setSearch={setSearch}
                  loading={loading}
                />
              )}
              {activeTab === "curricula" && (
                <CurriculaTab
                  curricula={curricula}
                  loading={loading}
                  title={newCurriculumTitle}
                  setTitle={setNewCurriculumTitle}
                  jsonData={newCurriculumJson}
                  setJsonData={setNewCurriculumJson}
                  onCreate={() => void handleCreateCurriculum()}
                  creating={creatingCurriculum}
                  onToggleStatus={toggleCurriculumStatus}
                  onReview={loadCurriculumForReview}
                  reviewLoading={reviewLoading}
                  editingCurriculumId={editingCurriculumId}
                  editingCurriculumTitle={editingCurriculumTitle}
                  setEditingCurriculumTitle={setEditingCurriculumTitle}
                  editingCurriculumJson={editingCurriculumJson}
                  setEditingCurriculumJson={setEditingCurriculumJson}
                  reviewData={reviewData}
                  onSaveChanges={() => void saveCurriculumChanges()}
                  savingCurriculum={savingCurriculum}
                  onDelete={removeCurriculum}
                  deletingCurriculumId={deletingCurriculumId}
                />
              )}
              {activeTab === "system" && <SystemTab routerPush={router.push} />}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function OverviewTab({
  overview,
  loading,
}: {
  overview: AdminOverviewResponse | null;
  loading: boolean;
}) {
  const metrics = overview?.metrics || {
    users: 0,
    curricula: 0,
    publishedCurricula: 0,
    drafts: 0,
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        <MetricCard label="Users" value={metrics.users} color={C.indigo} icon={<Users size={16} />} />
        <MetricCard label="Curricula" value={metrics.curricula} color={C.accent} icon={<BookOpen size={16} />} />
        <MetricCard
          label="Published"
          value={metrics.publishedCurricula}
          color={C.green}
          icon={<Shield size={16} />}
        />
        <MetricCard label="Drafts" value={metrics.drafts} color={C.pink} icon={<Sparkles size={16} />} />
      </div>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          background: C.ghost,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Latest Users</div>
        {loading && <div style={{ color: C.muted, fontSize: 12 }}>Loading users...</div>}
        {!loading && (overview?.latestUsers?.length || 0) === 0 && (
          <div style={{ color: C.muted, fontSize: 12 }}>No users yet.</div>
        )}
        {!loading && overview?.latestUsers?.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {overview.latestUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  background: C.surface,
                  padding: "8px 10px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 13 }}>{user.username}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{user.phone}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UsersTab({
  users,
  search,
  setSearch,
  loading,
}: {
  users: AdminUsersResponse["items"];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: C.ghost,
          padding: "8px 10px",
        }}
      >
        <Search size={14} style={{ color: C.muted }} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, phone, curriculum id"
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            width: "100%",
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {loading && <div style={{ color: C.muted, fontSize: 12 }}>Loading users...</div>}
        {!loading && users.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12 }}>No users match your search.</div>
        )}

        {!loading &&
          users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderRadius: 12,
                border: `1px solid ${C.border}`,
                background: C.ghost,
                padding: 12,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{user.username}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{user.phone}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>
                  Curriculum: {user.selectedCurriculumId || "None"}
                </div>
              </div>
              <div style={{ color: C.indigo, fontSize: 11, fontWeight: 700 }}>
                {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
      </div>
    </div>
  );
}

function CurriculaTab({
  curricula,
  loading,
  title,
  setTitle,
  jsonData,
  setJsonData,
  onCreate,
  creating,
  onToggleStatus,
  onReview,
  reviewLoading,
  editingCurriculumId,
  editingCurriculumTitle,
  setEditingCurriculumTitle,
  editingCurriculumJson,
  setEditingCurriculumJson,
  reviewData,
  onSaveChanges,
  savingCurriculum,
  onDelete,
  deletingCurriculumId,
}: {
  curricula: AdminCurriculaResponse["items"];
  loading: boolean;
  title: string;
  setTitle: (value: string) => void;
  jsonData: string;
  setJsonData: (value: string) => void;
  onCreate: () => void;
  creating: boolean;
  onToggleStatus: (id: string, current: "draft" | "published") => Promise<void>;
  onReview: (id: string) => Promise<void>;
  reviewLoading: boolean;
  editingCurriculumId: string | null;
  editingCurriculumTitle: string;
  setEditingCurriculumTitle: (value: string) => void;
  editingCurriculumJson: string;
  setEditingCurriculumJson: (value: string) => void;
  reviewData: AdminCurriculumDetailsResponse | null;
  onSaveChanges: () => void;
  savingCurriculum: boolean;
  onDelete: (id: string, title: string) => Promise<void>;
  deletingCurriculumId: string | null;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          background: C.ghost,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Create Curriculum</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Curriculum title"
            style={baseInputStyle}
          />
          <textarea
            value={jsonData}
            onChange={(event) => setJsonData(event.target.value)}
            placeholder="Raw curriculum JSON"
            rows={8}
            style={{ ...baseInputStyle, resize: "vertical", fontFamily: "monospace" }}
          />
          <button
            type="button"
            disabled={creating || !title.trim() || !jsonData.trim()}
            onClick={onCreate}
            style={{
              borderRadius: 10,
              border: `1px solid ${C.accent}55`,
              background: C.accent,
              color: "#0c0c10",
              padding: "10px 12px",
              fontWeight: 800,
              cursor: creating ? "wait" : "pointer",
            }}
          >
            {creating ? "Creating..." : "Create Draft Curriculum"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {loading && <div style={{ color: C.muted, fontSize: 12 }}>Loading curricula...</div>}
        {!loading && curricula.length === 0 && (
          <div style={{ color: C.muted, fontSize: 12 }}>No curricula yet.</div>
        )}

        {!loading &&
          curricula.map((item) => {
            const published = item.status === "published";
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.ghost,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{item.title}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>ID: {item.id}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    Version: {item.activeVersion}
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>
                    Updated: {new Date(item.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => void onReview(item.id)}
                    disabled={reviewLoading && editingCurriculumId === item.id}
                    style={{
                      borderRadius: 9,
                      border: `1px solid ${C.border}`,
                      background: C.surface,
                      color: C.text,
                      padding: "6px 10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Eye size={12} />
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => void onToggleStatus(item.id, item.status)}
                    style={{
                      borderRadius: 9,
                      border: `1px solid ${published ? `${C.green}55` : `${C.pink}55`}`,
                      background: published ? `${C.green}1b` : `${C.pink}1b`,
                      color: published ? C.green : C.pink,
                      padding: "6px 10px",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    {published ? "Published" : "Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item.id, item.title)}
                    disabled={deletingCurriculumId === item.id}
                    style={{
                      borderRadius: 9,
                      border: `1px solid ${C.red}44`,
                      background: `${C.red}15`,
                      color: C.red,
                      padding: "6px 10px",
                      fontWeight: 800,
                      cursor: "pointer",
                      fontSize: 11,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Trash2 size={12} />
                    {deletingCurriculumId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            );
          })}
      </div>

      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          background: C.ghost,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Review Workflow</h3>
        <p style={{ margin: 0, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
          Click <strong>Review</strong> to open the main app editor on <strong>/</strong>.
          Edit the curriculum there and use the top <strong>Save Upgrade</strong> button to
          create a new version.
        </p>
      </div>
    </div>
  );
}

function SystemTab({ routerPush }: { routerPush: (href: string) => void }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          background: C.ghost,
          padding: 12,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>System Notes</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 12, lineHeight: 1.7 }}>
          <li>Only published curricula appear in user signup options.</li>
          <li>Curriculum creation stores raw JSON data as versioned snapshots.</li>
          <li>User listing is loaded from file-based DB (`/DB/users/by-id`).</li>
        </ul>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => routerPush("/admin/login")}
          style={ghostButtonStyle}
        >
          Open Admin Login
        </button>
        <button type="button" onClick={() => routerPush("/signup")} style={ghostButtonStyle}>
          Open User Signup
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      style={{
        borderRadius: 12,
        border: `1px solid ${color}33`,
        background: `${color}13`,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          color,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900 }}>{value}</div>
    </motion.div>
  );
}

const baseInputStyle: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.surface,
  color: C.text,
  padding: "9px 11px",
  fontSize: 13,
  outline: "none",
  width: "100%",
};

const ghostButtonStyle: CSSProperties = {
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.ghost,
  color: C.text,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
};
