import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Save,
    ChevronUp,
    ChevronDown,
    Trash2,
    X,
    ChevronRight,
    Check,
    Circle,
    BookOpen,
    Edit3,
    CheckCircle,
    Plus,
} from "lucide-react";
import { C, DAY_NAMES, BADGES } from "@/lib/constants";
import { useLongPress } from "@/hooks/useLongPress";
import { uid, allLessonsOf } from "@/lib/utils";
import { Btn, Pill } from "@/components/ui/Shared";
import { LessonItem } from "./LessonItem";
import { Unit } from "@/lib/types";

export function UnitItem({
    unit,
    unitIdx,
    totalUnits,
    subId,
    subColor,
    expandedUnit,
    setExpandedUnit,
    update,
    onMoveUnit,
    onDeleteUnit,
    onRenameUnit,
    onConfetti,
}: {
    unit: Unit;
    unitIdx: number;
    totalUnits: number;
    subId: string;
    subColor: string;
    expandedUnit: string | null;
    setExpandedUnit: (id: string | null) => void;
    update: (updater: any) => void;
    onMoveUnit: (dir: number) => void;
    onDeleteUnit: () => void;
    onRenameUnit: (name: string) => void;
    onConfetti: () => void;
}) {
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState(unit.name);
    const [addingLes, setAddingLes] = useState(false);
    const [lesTitle, setLesTitle] = useState("");

    const open = expandedUnit === unit.id;

    const lp = useLongPress(() => setEditMode(true));

    const addLesson = () => {
        if (!lesTitle.trim()) return;
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((sub: any) =>
                sub.id !== subId
                    ? sub
                    : {
                        ...sub,
                        units: sub.units.map((u: any) =>
                            u.id !== unit.id
                                ? u
                                : {
                                    ...u,
                                    lessons: [
                                        ...u.lessons,
                                        {
                                            id: uid(),
                                            title: lesTitle.trim(),
                                            status: "pending",
                                            xp: 10,
                                        },
                                    ],
                                }
                        ),
                    }
            ),
        }));
        setLesTitle("");
        setAddingLes(false);
    };

    const cycleStatus = (lid: string) => {
        const cyc: Record<string, string> = {
            pending: "explained",
            explained: "solved",
            solved: "done",
            done: "pending",
        };
        let xpDelta = 0,
            xpDay = "",
            completed = false;

        update((s: any) => {
            const todayDay = DAY_NAMES[new Date().getDay()];
            const newSubs = s.subjects.map((sub: any) => {
                if (sub.id !== subId) return sub;
                return {
                    ...sub,
                    units: sub.units.map((u: any) => {
                        if (u.id !== unit.id) return u;
                        return {
                            ...u,
                            lessons: u.lessons.map((l: any) => {
                                if (l.id !== lid) return l;
                                const nxt = cyc[l.status];
                                let updatedL = { ...l, status: nxt };

                                if (l.status === "solved" && nxt === "done") {
                                    xpDelta = l.xp;
                                    xpDay = todayDay;
                                    completed = true;
                                    updatedL.completedAt = todayDay;
                                } else if (l.status === "done" && nxt === "pending") {
                                    xpDelta = -l.xp;
                                    xpDay = l.completedAt || todayDay;
                                    updatedL.completedAt = undefined;
                                }
                                return updatedL;
                            }),
                        };
                    }),
                };
            });

            const newXp = Math.max(0, s.xp + xpDelta);
            const todayStr = new Date().toDateString();
            const newStr = s.lastActive !== todayStr && xpDelta > 0 ? s.streak + 1 : s.streak;

            const wk = [...(s.weeklyData || [])];
            if (xpDelta !== 0 && xpDay) {
                const wi = wk.findIndex((x) => x.day === xpDay);
                if (wi >= 0) {
                    wk[wi] = {
                        ...wk[wi],
                        xp: Math.max(0, wk[wi].xp + xpDelta),
                        lessons: Math.max(0, wk[wi].lessons + (xpDelta > 0 ? 1 : -1)),
                    };
                }
            }

            const newCT = xpDelta > 0 && xpDay === todayDay ? s.completedToday + 1 :
                xpDelta < 0 && xpDay === todayDay ? Math.max(0, s.completedToday - 1) :
                    s.completedToday;

            const ns = {
                ...s,
                subjects: newSubs,
                xp: newXp,
                completedToday: newCT,
                streak: newStr,
                lastActive: xpDelta > 0 ? todayStr : s.lastActive,
                weeklyData: wk,
            };

            const earned = [...(s.earnedBadges || [])];
            BADGES.forEach((b) => {
                if (!earned.includes(b.id) && b.req(ns)) {
                    earned.push(b.id);
                }
            });

            return { ...ns, earnedBadges: earned };
        });

        if (completed) onConfetti();
    };

    // Re-implementing deleteLesson and moveLesson...
    const deleteLesson = (lid: string) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((sub: any) =>
                sub.id !== subId
                    ? sub
                    : {
                        ...sub,
                        units: sub.units.map((u: any) =>
                            u.id !== unit.id
                                ? u
                                : { ...u, lessons: u.lessons.filter((l: any) => l.id !== lid) },
                        ),
                    },
            ),
        }));
    };

    const moveLesson = (lid: string, dir: number) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((sub: any) =>
                sub.id !== subId
                    ? sub
                    : {
                        ...sub,
                        units: sub.units.map((u: any) => {
                            if (u.id !== unit.id) return u;
                            const lessons = [...u.lessons];
                            const i = lessons.findIndex((l: any) => l.id === lid),
                                j = i + dir;
                            if (j < 0 || j >= lessons.length) return u;
                            [lessons[i], lessons[j]] = [lessons[j], lessons[i]];
                            return { ...u, lessons };
                        }),
                    },
            ),
        }));
    };

    // Importing BADGES for cycleStatus logic
    // But wait, the Update function in cycleStatus didn't include the Badge check in my copy above.
    // I need to add it.

    const SC: any = {
        pending: C.muted,
        explained: C.indigo,
        solved: C.accent,
        done: C.green,
    };
    const SI: any = {
        pending: <Circle size={12} />,
        explained: <BookOpen size={12} />,
        solved: <Edit3 size={12} />,
        done: <CheckCircle size={12} />,
    };
    const SL: any = {
        pending: "Pending",
        explained: "Explained",
        solved: "Solving",
        done: "Done",
    };

    const done = unit.lessons.filter((l) => l.status === "done").length;
    const total = unit.lessons.length;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40 }}
            style={{ marginBottom: 10 }}
        >
            <div
                style={{
                    background: C.card,
                    border: `1px solid ${open ? subColor + "55" : C.border}`,
                    borderRadius: 14,
                    overflow: "hidden",
                }}
            >
                {/* Unit header */}
                <div style={{ padding: "12px 14px" }}>
                    {editMode ? (
                        /* Edit toolbar */
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                                flexWrap: "wrap",
                            }}
                        >
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        onRenameUnit(editName);
                                        setEditMode(false);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: 80,
                                    background: C.ghost,
                                    border: `1px solid ${subColor}55`,
                                    borderRadius: 7,
                                    padding: "4px 8px",
                                    color: C.text,
                                    fontSize: 12,
                                    outline: "none",
                                }}
                            />
                            <Btn
                                style={{ padding: "4px 8px", fontSize: 10 }}
                                onClick={() => {
                                    onRenameUnit(editName);
                                    setEditMode(false);
                                }}
                            >
                                <Save size={10} /> Save
                            </Btn>
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => onMoveUnit(-1)}
                                disabled={unitIdx === 0}
                                style={{
                                    background: C.ghost,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 6,
                                    color: unitIdx === 0 ? C.border : C.muted,
                                    cursor: "pointer",
                                    padding: "4px 6px",
                                }}
                            >
                                <ChevronUp size={11} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => onMoveUnit(1)}
                                disabled={unitIdx === totalUnits - 1}
                                style={{
                                    background: C.ghost,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 6,
                                    color: unitIdx === totalUnits - 1 ? C.border : C.muted,
                                    cursor: "pointer",
                                    padding: "4px 6px",
                                }}
                            >
                                <ChevronDown size={11} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={onDeleteUnit}
                                style={{
                                    background: `${C.red}22`,
                                    border: `1px solid ${C.red}44`,
                                    borderRadius: 6,
                                    color: C.red,
                                    cursor: "pointer",
                                    padding: "4px 6px",
                                }}
                            >
                                <Trash2 size={11} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={() => setEditMode(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: C.muted,
                                    cursor: "pointer",
                                    padding: "4px",
                                }}
                            >
                                <X size={12} />
                            </motion.button>
                        </motion.div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                cursor: "pointer",
                            }}
                            {...lp}
                            onClick={() => setExpandedUnit(open ? null : unit.id)}
                        >
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 3,
                                    background: subColor,
                                    flexShrink: 0,
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>
                                    {unit.name}
                                </div>
                                <div style={{ fontSize: 10, color: C.muted }}>
                                    {done}/{total} done
                                </div>
                            </div>
                            {total > 0 && (
                                <Pill color={subColor}>
                                    {Math.round((done / total) * 100)}%
                                </Pill>
                            )}
                            <motion.div
                                animate={{ rotate: open ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronRight size={13} style={{ color: C.muted }} />
                            </motion.div>
                        </div>
                    )}
                    {/* Progress bar */}
                    {total > 0 && !editMode && (
                        <div
                            style={{
                                height: 2,
                                background: C.border,
                                borderRadius: 99,
                                marginTop: 8,
                            }}
                        >
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round((done / total) * 100)}%` }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    background: subColor,
                                    height: "100%",
                                    borderRadius: 99,
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Lessons */}
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                overflow: "hidden",
                                borderTop: `1px solid ${C.border}`,
                                padding: "10px 14px",
                            }}
                        >
                            <AnimatePresence>
                                {unit.lessons.map((l, li) => (
                                    <LessonItem
                                        key={l.id}
                                        lesson={l}
                                        lesIdx={li}
                                        totalLes={unit.lessons.length}
                                        SC={SC}
                                        SI={SI}
                                        SL={SL}
                                        onCycle={() => cycleStatus(l.id)}
                                        onDelete={() => deleteLesson(l.id)}
                                        onMove={(dir) => moveLesson(l.id, dir)}
                                        onRename={(name) =>
                                            update((s: any) => ({
                                                ...s,
                                                subjects: s.subjects.map((sub: any) =>
                                                    sub.id !== subId
                                                        ? sub
                                                        : {
                                                            ...sub,
                                                            units: sub.units.map((u: any) =>
                                                                u.id !== unit.id
                                                                    ? u
                                                                    : {
                                                                        ...u,
                                                                        lessons: u.lessons.map((x: any) =>
                                                                            x.id !== l.id
                                                                                ? x
                                                                                : { ...x, title: name },
                                                                        ),
                                                                    },
                                                            ),
                                                        },
                                                ),
                                            }))
                                        }
                                    />
                                ))}
                            </AnimatePresence>

                            {/* Add lesson */}
                            {addingLes ? (
                                <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                                    <input
                                        value={lesTitle}
                                        onChange={(e) => setLesTitle(e.target.value)}
                                        placeholder="Lesson title..."
                                        onKeyDown={(e) => e.key === "Enter" && addLesson()}
                                        autoFocus
                                        style={{
                                            flex: 1,
                                            background: C.ghost,
                                            border: `1px solid ${C.border}`,
                                            borderRadius: 8,
                                            padding: "6px 10px",
                                            color: C.text,
                                            fontSize: 12,
                                            outline: "none",
                                        }}
                                    />
                                    <Btn style={{ padding: "6px 10px" }} onClick={addLesson}>
                                        <Check size={12} />
                                    </Btn>
                                    <Btn
                                        variant="secondary"
                                        style={{ padding: "6px 8px" }}
                                        onClick={() => setAddingLes(false)}
                                    >
                                        <X size={12} />
                                    </Btn>
                                </div>
                            ) : (
                                <Btn
                                    variant="ghost"
                                    style={{ marginTop: 8, fontSize: 11 }}
                                    onClick={() => setAddingLes(true)}
                                >
                                    <Plus size={12} /> Add Lesson
                                </Btn>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
