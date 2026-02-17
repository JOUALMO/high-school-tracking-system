import { motion } from "framer-motion";
import { C, BADGES } from "@/lib/constants";
import { allLessonsOf, levelFor, nextLevel } from "@/lib/utils";
import { Card, XPBar } from "@/components/ui/Shared";
import { AppState } from "@/lib/types";
import { page, card, pop } from "@/lib/motion";

export function Achievements({ state }: { state: AppState }) {
    const allLessons = allLessonsOf(state);
    const done = allLessons.filter((l) => l.status === "done").length;
    const total = allLessons.length;
    const cur = levelFor(state.xp);
    const nxt = nextLevel(state.xp);
    const totalMins = (state.sessions || []).reduce(
        (a, b) => a + (b.duration || 0),
        0
    );

    return (
        <motion.div
            variants={page}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
            <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text }}>
                🏆 Achievements
            </h2>

            <Card
                delay={0}
                style={{
                    background: "linear-gradient(135deg,#1a1430,#0f1a24)",
                    border: `1px solid ${cur.color}44`,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                color: C.muted,
                                marginBottom: 3,
                                fontWeight: 700,
                                letterSpacing: 1,
                            }}
                        >
                            CURRENT LEVEL
                        </div>
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            style={{ fontSize: 26, fontWeight: 900, color: cur.color }}
                        >
                            Level {cur.level}
                        </motion.div>
                        <div style={{ fontSize: 13, color: cur.color, opacity: 0.7 }}>
                            {cur.name}
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{ textAlign: "right" }}
                    >
                        <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>
                            {state.xp}
                        </div>
                        <div style={{ fontSize: 10, color: C.muted }}>Total XP</div>
                    </motion.div>
                </div>
                <XPBar xp={state.xp} />
                {nxt && (
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
                        🎯 {nxt.min - state.xp} XP to unlock{" "}
                        <span style={{ color: nxt.color, fontWeight: 700 }}>
                            {nxt.name}
                        </span>
                    </div>
                )}
            </Card>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: 10,
                }}
            >
                {[
                    {
                        l: "Best Streak",
                        v: `${state.streak}d`,
                        icon: "🔥",
                        color: C.accent,
                    },
                    {
                        l: "Lessons Done",
                        v: `${done}/${total}`,
                        icon: "📖",
                        color: C.green,
                    },
                    {
                        l: "Focus Sessions",
                        v: (state.sessions || []).length,
                        icon: "⏱️",
                        color: C.indigo,
                    },
                    { l: "Time Studied", v: `${totalMins}m`, icon: "⌛", color: C.pink },
                ].map((s, i) => (
                    <motion.div
                        key={s.l}
                        variants={card(i + 1)}
                        style={{
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            padding: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span style={{ fontSize: 22 }}>{s.icon}</span>
                        <div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: s.color }}>
                                {s.v}
                            </div>
                            <div style={{ fontSize: 10, color: C.muted }}>{s.l}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div>
                <h3
                    style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: C.text,
                        marginBottom: 12,
                        letterSpacing: 0.5,
                    }}
                >
                    BADGES ({state.earnedBadges?.length || 0}/{BADGES.length})
                </h3>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2,1fr)",
                        gap: 10,
                    }}
                >
                    {BADGES.map((badge, i) => {
                        const earned = state.earnedBadges?.includes(badge.id);
                        return (
                            <motion.div
                                key={badge.id}
                                variants={card(i + 5)}
                                whileHover={earned ? { scale: 1.03 } : {}}
                                style={{
                                    background: earned ? `${C.accent}12` : C.card,
                                    border: `1px solid ${earned ? C.accent + "55" : C.border}`,
                                    borderRadius: 14,
                                    padding: "13px",
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "center",
                                    opacity: earned ? 1 : 0.4,
                                }}
                            >
                                <motion.span
                                    animate={earned ? { rotate: [0, 12, -12, 0] } : {}}
                                    transition={{ duration: 0.4, delay: i * 0.05 }}
                                    style={{
                                        fontSize: 24,
                                        filter: earned ? "none" : "grayscale(100%)",
                                    }}
                                >
                                    {badge.icon}
                                </motion.span>
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 800,
                                            fontSize: 12,
                                            color: earned ? C.accent : C.muted,
                                        }}
                                    >
                                        {badge.name}
                                    </div>
                                    <div
                                        style={{ fontSize: 10, color: C.muted, lineHeight: 1.4 }}
                                    >
                                        {badge.desc}
                                    </div>
                                    {earned && (
                                        <motion.div
                                            {...pop}
                                            style={{
                                                fontSize: 9,
                                                color: C.green,
                                                marginTop: 3,
                                                fontWeight: 800,
                                            }}
                                        >
                                            ✓ EARNED
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
