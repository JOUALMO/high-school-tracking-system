import { motion } from "framer-motion";
import { C } from "@/lib/constants";
import { Pill } from "@/components/ui/Shared";
import { AppState, Subject } from "@/lib/types";
import { page, card } from "@/lib/motion";

export function Schedule({
    state,
    setView,
}: {
    state: AppState;
    setView: (v: string, data?: any) => void;
}) {
    const DAYS = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    const todayI = new Date().getDay();

    // Build plan from scheduleDays
    const plan: Record<string, Subject[]> = Object.fromEntries(
        DAYS.map((d, i) => [d, []])
    );
    state.subjects.forEach((sub) => {
        (sub.scheduleDays || []).forEach((dayIdx) => {
            plan[DAYS[dayIdx]].push(sub);
        });
    });

    const totalScheduled = Object.values(plan).reduce((a, b) => a + b.length, 0);

    return (
        <motion.div
            variants={page}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
            <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text }}>
                📅 Weekly Schedule
            </h2>

            <motion.div
                variants={card(0)}
                style={{
                    background: "linear-gradient(135deg,#14122a,#0c1620)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    border: `1px solid ${C.border}`,
                }}
            >
                <div style={{ fontSize: 11, color: C.muted }}>
                    Scheduled based on your selected study days
                </div>
                <div
                    style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}
                >
                    <Pill color={C.green}>
                        Today: {plan[DAYS[todayI]]?.length || 0} subjects
                    </Pill>
                    <Pill color={C.indigo}>{state.subjects.length} total subjects</Pill>
                    <Pill color={C.accent}>{totalScheduled} sessions/week</Pill>
                </div>
            </motion.div>

            {DAYS.map((day, i) => {
                const isToday = i === todayI;
                const subs = plan[day];
                return (
                    <motion.div
                        key={day}
                        variants={card(i + 1)}
                        style={{
                            background: isToday
                                ? "linear-gradient(135deg,#1a1430,#0f0f1a)"
                                : C.card,
                            border: `1px solid ${isToday ? C.accent + "55" : C.border}`,
                            borderRadius: 14,
                            padding: "14px 16px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: subs.length ? 10 : 0,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {isToday && (
                                    <motion.div
                                        animate={{ scale: [1, 1.5, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            background: C.accent,
                                        }}
                                    />
                                )}
                                <span
                                    style={{
                                        fontWeight: 800,
                                        fontSize: 13,
                                        color: isToday ? C.accent : C.text,
                                    }}
                                >
                                    {day}
                                    {isToday ? " — Today" : ""}
                                </span>
                            </div>
                            {subs.length === 0 && (
                                <span style={{ fontSize: 11, color: C.muted }}>
                                    Rest day 😴
                                </span>
                            )}
                            {subs.length > 0 && (
                                <span style={{ fontSize: 10, color: C.muted }}>
                                    {subs.length} subject{subs.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        {subs.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                                {subs.map((sub) => (
                                    <motion.div
                                        key={sub.id}
                                        whileHover={{ scale: 1.04 }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            background: `${sub.color}18`,
                                            border: `1px solid ${sub.color}44`,
                                            borderRadius: 8,
                                            padding: "5px 10px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                background: sub.color,
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: sub.color,
                                            }}
                                        >
                                            {sub.name}
                                        </span>
                                        {isToday && (
                                            <button
                                                onClick={() => setView("lockin", sub)}
                                                style={{
                                                    background: sub.color,
                                                    border: "none",
                                                    borderRadius: 5,
                                                    color: "#000",
                                                    padding: "1px 6px",
                                                    fontSize: 10,
                                                    cursor: "pointer",
                                                    fontWeight: 900,
                                                }}
                                            >
                                                ▶
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </motion.div>
    );
}
