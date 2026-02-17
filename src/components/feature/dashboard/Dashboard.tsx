import { motion, AnimatePresence } from "framer-motion";
import {
    Flame,
    Zap,
    Target,
    ChevronRight,
    Play,
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { C, DAY_NAMES, BADGES } from "@/lib/constants";
import { allLessonsOf } from "@/lib/utils";
import { AppState, Subject } from "@/lib/types";
import { page, card } from "@/lib/motion";
import { Card, Pill, Btn, XPBar } from "@/components/ui/Shared";

export function Dashboard({
    state,
    update,
    setView,
}: {
    state: AppState;
    update: (updater: any) => void;
    setView: (v: string, data?: any) => void;
}) {
    const allLessons = allLessonsOf(state);
    const done = allLessons.filter((l) => l.status === "done").length;
    const total = allLessons.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const circ = 2 * Math.PI * 38;
    const todayIdx = new Date().getDay();

    const todaySubs = state.subjects.filter((s) =>
        (s.scheduleDays || []).includes(todayIdx)
    );

    return (
        <motion.div
            variants={page}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
            {/* Hero */}
            <motion.div
                variants={card(0)}
                style={{
                    background: "linear-gradient(135deg,#14122a 0%,#0c1620 100%)",
                    borderRadius: 20,
                    padding: 26,
                    border: `1px solid ${C.border}`,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 5, repeat: Infinity }}
                    style={{
                        position: "absolute",
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        background: `radial-gradient(circle,${C.accent}30,transparent 70%)`,
                        borderRadius: "50%",
                        pointerEvents: "none",
                    }}
                />
                <div style={{ position: "relative" }}>
                    <motion.h2
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{
                            fontSize: 21,
                            fontWeight: 900,
                            color: C.text,
                            marginBottom: 3,
                        }}
                    >
                        Ready to grind? 🎓
                    </motion.h2>
                    <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                    <XPBar xp={state.xp} />
                </div>
            </motion.div>

            {/* Stat Cards */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 10,
                }}
            >
                {[
                    {
                        l: "Streak",
                        v: `${state.streak}d`,
                        icon: <Flame size={16} />,
                        color: C.accent,
                        pulse: true,
                    },
                    {
                        l: "Total XP",
                        v: state.xp,
                        icon: <Zap size={16} />,
                        color: C.indigo,
                    },
                    {
                        l: "Today",
                        v: state.completedToday,
                        icon: <Target size={16} />,
                        color: C.green,
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.l}
                        variants={card(i + 1)}
                        style={{
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            padding: "14px 10px",
                            textAlign: "center",
                        }}
                    >
                        <motion.div
                            animate={s.pulse ? { scale: [1, 1.15, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                            style={{
                                color: s.color,
                                display: "flex",
                                justifyContent: "center",
                                marginBottom: 8,
                            }}
                        >
                            {s.icon}
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                                delay: 0.3 + i * 0.1,
                                type: "spring",
                                stiffness: 300,
                            }}
                            style={{ fontSize: 22, fontWeight: 900, color: s.color }}
                        >
                            {s.v}
                        </motion.div>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                            {s.l}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Progress ring + Weekly chart */}
            <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12 }}
            >
                <Card
                    delay={4}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 6,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                        }}
                    >
                        CURRICULUM
                    </div>
                    <div style={{ position: "relative", width: 96, height: 96 }}>
                        <svg width="96" height="96">
                            <circle
                                cx="48"
                                cy="48"
                                r="38"
                                fill="none"
                                stroke={C.border}
                                strokeWidth="7"
                            />
                            <motion.circle
                                cx="48"
                                cy="48"
                                r="38"
                                fill="none"
                                stroke={C.accent}
                                strokeWidth="7"
                                strokeLinecap="round"
                                initial={{
                                    strokeDashoffset: circ,
                                    strokeDasharray: `${circ} ${circ}`,
                                }}
                                animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
                                transition={{ duration: 1.3, delay: 0.5, ease: "easeOut" }}
                                style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "48px 48px",
                                }}
                            />
                        </svg>
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.9 }}
                                style={{ fontSize: 18, fontWeight: 900, color: C.accent }}
                            >
                                {pct}%
                            </motion.span>
                        </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
                        {done}/{total} done
                    </div>
                </Card>
                <Card delay={5} style={{ padding: 14 }}>
                    <div
                        style={{
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 6,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                        }}
                    >
                        WEEKLY XP
                    </div>
                    <ResponsiveContainer width="100%" height={114}>
                        <AreaChart data={state.weeklyData}>
                            <defs>
                                <linearGradient id="xpg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={C.indigo} stopOpacity={0.5} />
                                    <stop offset="100%" stopColor={C.indigo} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="day"
                                tick={{ fill: C.muted, fontSize: 9 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    background: C.card,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 8,
                                    color: C.text,
                                    fontSize: 11,
                                }}
                                cursor={{
                                    stroke: C.indigo,
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="xp"
                                stroke={C.indigo}
                                fill="url(#xpg)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Today's Subjects */}
            <Card delay={6}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 14,
                    }}
                >
                    <h3 style={{ fontWeight: 800, fontSize: 14, color: C.text }}>
                        📋 Today's Subjects
                    </h3>
                    <Btn
                        variant="ghost"
                        onClick={() => setView("curriculum")}
                        style={{ fontSize: 11 }}
                    >
                        All <ChevronRight size={11} />
                    </Btn>
                </div>
                {todaySubs.length === 0 && (
                    <div
                        style={{
                            textAlign: "center",
                            color: C.muted,
                            padding: "18px 0",
                            fontSize: 12,
                        }}
                    >
                        No subjects scheduled for today 📚
                    </div>
                )}
                <AnimatePresence>
                    {todaySubs.slice(0, 4).map((sub, i) => {
                        const lessons = (sub.units || []).flatMap((u) => u.lessons || []);
                        const sd = lessons.filter((l) => l.status === "done").length,
                            st = lessons.length;
                        return (
                            <motion.div
                                key={sub.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "9px 0",
                                    borderBottom: `1px solid ${C.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: "50%",
                                        background: sub.color,
                                        flexShrink: 0,
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                                        {sub.name}
                                    </div>
                                    <div style={{ fontSize: 10, color: C.muted }}>
                                        {sd}/{st} done ·{" "}
                                        {(sub.scheduleDays || [])
                                            .map((d) => DAY_NAMES[d].slice(0, 2))
                                            .join("/")}
                                    </div>
                                </div>
                                <Pill color={sub.color}>
                                    {st > 0 ? Math.round((sd / st) * 100) : 0}%
                                </Pill>
                                <Btn
                                    variant="primary"
                                    style={{ padding: "4px 12px", fontSize: 11 }}
                                    onClick={() => setView("lockin", sub)}
                                >
                                    <Play size={11} /> Go
                                </Btn>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </Card>

            {/* Recent Badges */}
            <AnimatePresence>
                {(state.earnedBadges || []).length > 0 && (
                    <Card delay={7}>
                        <h3
                            style={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: C.text,
                                marginBottom: 12,
                            }}
                        >
                            🏅 Latest Badges
                        </h3>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {(state.earnedBadges || []).slice(-3).map((bid, i) => {
                                const b = BADGES.find((b) => b.id === bid);
                                return b ? (
                                    <motion.div
                                        key={bid}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            delay: i * 0.1,
                                            type: "spring",
                                            stiffness: 400,
                                        }}
                                        style={{
                                            background: C.ghost,
                                            border: `1px solid ${C.accent}44`,
                                            borderRadius: 12,
                                            padding: "8px 12px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{ fontSize: 20 }}>{b.icon}</span>
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 800,
                                                    color: C.accent,
                                                }}
                                            >
                                                {b.name}
                                            </div>
                                            <div style={{ fontSize: 10, color: C.muted }}>
                                                {b.desc}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : null;
                            })}
                        </div>
                    </Card>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
