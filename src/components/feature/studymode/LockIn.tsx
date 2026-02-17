import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, RefreshCw, X, Clock } from "lucide-react";
import { C, BADGES } from "@/lib/constants";
import { uid, today } from "@/lib/utils";
import { Card, Btn, Pill, Confetti } from "@/components/ui/Shared";
import { AppState, Subject } from "@/lib/types";
import { page } from "@/lib/motion";

export function LockIn({
    state,
    update,
    defaultSubject,
}: {
    state: AppState;
    update: (updater: any) => void;
    defaultSubject: Subject | null;
}) {
    const [selSub, setSelSub] = useState<Subject | null>(
        defaultSubject || state.subjects[0] || null
    );
    const [dur, setDur] = useState(25);
    const [left, setLeft] = useState(25 * 60);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [confetti, setConfetti] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const mins = Math.floor(left / 60);
    const secs = left % 60;
    const circ = 2 * Math.PI * 80;
    const pct = 1 - left / (dur * 60);

    useEffect(() => {
        if (running && left > 0) {
            timerRef.current = setInterval(() => setLeft((t) => t - 1), 1000);
        } else if (left === 0 && running) {
            setRunning(false);
            setDone(true);
            setConfetti(true);
            update((s: any) => {
                const bonusXP = Math.round(dur / 5) * 5;
                const sessions = [
                    ...(s.sessions || []),
                    { id: uid(), subjectId: selSub?.id, duration: dur, date: today() },
                ];
                const ns = { ...s, sessions, xp: s.xp + bonusXP };
                const earned = [...(s.earnedBadges || [])];
                BADGES.forEach((b) => {
                    if (!earned.includes(b.id) && b.req(ns)) earned.push(b.id);
                });
                return { ...ns, earnedBadges: earned };
            });
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [running, left, dur, selSub, update]);

    const start = () => {
        setLeft(dur * 60);
        setDone(false);
        setRunning(true);
    };
    const stop = () => {
        setRunning(false);
        setLeft(dur * 60);
    };
    const reset = () => {
        setDone(false);
        setRunning(false);
        setLeft(dur * 60);
    };

    return (
        <motion.div
            variants={page}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                alignItems: "center",
            }}
        >
            {confetti && <Confetti onDone={() => setConfetti(false)} />}
            <h2
                style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: C.text,
                    alignSelf: "flex-start",
                }}
            >
                🔒 Lock-In Session
            </h2>

            {!running && !done && (
                <Card delay={0} style={{ width: "100%", maxWidth: 360 }}>
                    <h4
                        style={{
                            color: C.accent,
                            fontWeight: 800,
                            marginBottom: 14,
                            fontSize: 11,
                            letterSpacing: 1,
                        }}
                    >
                        SESSION SETUP
                    </h4>
                    <div style={{ marginBottom: 14 }}>
                        <label
                            style={{
                                fontSize: 11,
                                color: C.muted,
                                display: "block",
                                marginBottom: 7,
                            }}
                        >
                            Subject
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {state.subjects.map((sub) => (
                                <motion.button
                                    key={sub.id}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelSub(sub)}
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: 8,
                                        border: `1px solid ${selSub?.id === sub.id ? sub.color : C.border}`,
                                        background:
                                            selSub?.id === sub.id ? `${sub.color}22` : C.ghost,
                                        color: selSub?.id === sub.id ? sub.color : C.muted,
                                        cursor: "pointer",
                                        fontSize: 12,
                                        fontWeight: 700,
                                    }}
                                >
                                    {sub.name}
                                </motion.button>
                            ))}
                            {state.subjects.length === 0 && (
                                <span style={{ color: C.muted, fontSize: 11 }}>
                                    Add subjects in Curriculum first
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ marginBottom: 18 }}>
                        <label
                            style={{
                                fontSize: 11,
                                color: C.muted,
                                display: "block",
                                marginBottom: 7,
                            }}
                        >
                            Duration
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            {[15, 25, 45, 60].map((d) => (
                                <motion.button
                                    key={d}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setDur(d);
                                        setLeft(d * 60);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: "9px 0",
                                        borderRadius: 8,
                                        border: `1px solid ${dur === d ? C.accent : C.border}`,
                                        background: dur === d ? `${C.accent}22` : C.ghost,
                                        color: dur === d ? C.accent : C.muted,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: 900,
                                    }}
                                >
                                    {d}m
                                </motion.button>
                            ))}
                        </div>
                    </div>
                    <Btn
                        onClick={start}
                        style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                        disabled={!selSub}
                    >
                        <Lock size={14} /> Start Lock-In
                    </Btn>
                </Card>
            )}

            {(running || done) && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 20,
                    }}
                >
                    {running && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                padding: "7px 20px",
                                background: `${C.red}18`,
                                border: `1px solid ${C.red}44`,
                                borderRadius: 10,
                            }}
                        >
                            <motion.span
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ color: C.red, fontSize: 11, fontWeight: 800 }}
                            >
                                🔒 LOCKED IN — Stay focused!
                            </motion.span>
                        </motion.div>
                    )}
                    <div style={{ position: "relative", width: 200, height: 200 }}>
                        <svg width="200" height="200">
                            <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke={C.border}
                                strokeWidth="8"
                            />
                            <motion.circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke={done ? C.green : selSub?.color || C.accent}
                                strokeWidth="8"
                                strokeLinecap="round"
                                style={{
                                    transform: "rotate(-90deg)",
                                    transformOrigin: "100px 100px",
                                    strokeDasharray: `${circ} ${circ}`,
                                }}
                                animate={{ strokeDashoffset: circ - pct * circ }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
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
                            {done ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    style={{ textAlign: "center" }}
                                >
                                    <div style={{ fontSize: 44 }}>🎉</div>
                                    <div
                                        style={{ fontSize: 14, color: C.green, fontWeight: 900 }}
                                    >
                                        Complete!
                                    </div>
                                </motion.div>
                            ) : (
                                <>
                                    <div
                                        style={{
                                            fontSize: 36,
                                            fontWeight: 900,
                                            color: C.text,
                                            letterSpacing: -2,
                                            fontVariantNumeric: "tabular-nums",
                                        }}
                                    >
                                        {String(mins).padStart(2, "0")}:
                                        {String(secs).padStart(2, "0")}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: selSub?.color || C.muted,
                                            marginTop: 4,
                                        }}
                                    >
                                        {selSub?.name}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    {done ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: "center" }}
                        >
                            <div
                                style={{
                                    fontSize: 19,
                                    color: C.green,
                                    fontWeight: 900,
                                    marginBottom: 4,
                                }}
                            >
                                +{Math.round(dur / 5) * 5} XP Earned! 🔥
                            </div>
                            <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
                                Outstanding! Keep the momentum.
                            </div>
                            <Btn onClick={reset}>
                                <RefreshCw size={13} /> New Session
                            </Btn>
                        </motion.div>
                    ) : (
                        <Btn variant="danger" onClick={stop}>
                            <X size={13} /> End Early
                        </Btn>
                    )}
                </div>
            )}

            {state.sessions?.length > 0 && !running && (
                <Card delay={2} style={{ width: "100%", maxWidth: 360 }}>
                    <h4
                        style={{
                            color: C.text,
                            fontWeight: 800,
                            marginBottom: 12,
                            fontSize: 13,
                        }}
                    >
                        Recent Sessions
                    </h4>
                    {state.sessions
                        .slice(-5)
                        .reverse()
                        .map((ses, i) => {
                            const sub = state.subjects.find((s) => s.id === ses.subjectId);
                            return (
                                <motion.div
                                    key={ses.id}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "7px 0",
                                        borderBottom: `1px solid ${C.border}`,
                                    }}
                                >
                                    <div
                                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                                    >
                                        <Clock size={12} style={{ color: C.muted }} />
                                        <span style={{ fontSize: 12, color: C.text }}>
                                            {sub?.name || "Unknown"}
                                        </span>
                                    </div>
                                    <div
                                        style={{ display: "flex", gap: 7, alignItems: "center" }}
                                    >
                                        <Pill color={C.indigo}>{ses.duration}min</Pill>
                                        <span style={{ fontSize: 10, color: C.muted }}>
                                            {ses.date}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                </Card>
            )}
        </motion.div>
    );
}
