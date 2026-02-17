import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, ChevronUp, ChevronDown, Trash2, X } from "lucide-react";
import { C } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { page } from "@/lib/motion";
import { Btn, Confetti } from "@/components/ui/Shared";
import { SubjectForm } from "./SubjectForm";
import { SubjectContent } from "./SubjectContent";
import { AppState, Subject } from "@/lib/types";

export function Curriculum({
    state,
    update,
}: {
    state: AppState;
    update: (updater: any) => void;
}) {
    const [selectedSubId, setSelectedSubId] = useState<string | null>(
        state.subjects[0]?.id || null
    );
    const [showAddSub, setShowAddSub] = useState(false);
    const [editingSub, setEditingSub] = useState<string | null>(null); // subject id being edited
    const [editModeSubId, setEditModeSubId] = useState<string | null>(null); // long-pressed subject tab
    const [confetti, setConfetti] = useState(false);

    const selectedSub = state.subjects.find((s) => s.id === selectedSubId);

    // If selected subject was deleted, pick first
    useEffect(() => {
        if (!selectedSub && state.subjects.length > 0)
            setSelectedSubId(state.subjects[0].id);
    }, [state.subjects, selectedSub]);

    const addSubject = ({
        name,
        color,
        scheduleDays,
    }: {
        name: string;
        color: string;
        scheduleDays: number[];
    }) => {
        const newSub: Subject = { id: uid(), name, color, scheduleDays, units: [] };
        update((s: any) => ({ ...s, subjects: [...s.subjects, newSub] }));
        setSelectedSubId(newSub.id);
        setShowAddSub(false);
    };

    const saveEditSub = ({
        name,
        color,
        scheduleDays,
    }: {
        name: string;
        color: string;
        scheduleDays: number[];
    }) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((sub: any) =>
                sub.id === editingSub ? { ...sub, name, color, scheduleDays } : sub
            ),
        }));
        setEditingSub(null);
    };

    const deleteSubject = (id: string) => {
        update((s: any) => {
            const newSubs = s.subjects.filter((x: any) => x.id !== id);
            return { ...s, subjects: newSubs };
        });
        if (selectedSubId === id)
            setSelectedSubId(state.subjects.find((x) => x.id !== id)?.id || null);
        setEditModeSubId(null);
    };

    const moveSubject = (id: string, dir: number) => {
        update((s: any) => {
            const subs = [...s.subjects];
            const i = subs.findIndex((x) => x.id === id);
            const j = i + dir;
            if (j < 0 || j >= subs.length) return s;
            [subs[i], subs[j]] = [subs[j], subs[i]];
            return { ...s, subjects: subs };
        });
    };

    const tabScrollRef = useRef<HTMLDivElement>(null);

    return (
        <motion.div
            variants={page}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ display: "flex", flexDirection: "column", gap: 0 }}
        >
            {confetti && <Confetti onDone={() => setConfetti(false)} />}

            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                }}
            >
                <h2 style={{ fontSize: 17, fontWeight: 900, color: C.text }}>
                    📚 Curriculum
                </h2>
                <Btn
                    onClick={() => {
                        setShowAddSub(true);
                        setEditingSub(null);
                    }}
                    style={{ padding: "6px 12px", fontSize: 12 }}
                >
                    <Plus size={13} /> Subject
                </Btn>
            </div>

            {/* Add Subject form */}
            <AnimatePresence>
                {showAddSub && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginBottom: 14 }}
                    >
                        <SubjectForm
                            onSave={addSubject}
                            onCancel={() => setShowAddSub(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Subject form */}
            <AnimatePresence>
                {editingSub && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ marginBottom: 14 }}
                    >
                        <SubjectForm
                            title="EDIT SUBJECT"
                            initial={state.subjects.find((s) => s.id === editingSub)}
                            onSave={saveEditSub}
                            onCancel={() => setEditingSub(null)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subject Tabs Bar */}
            {state.subjects.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    {/* Hint */}
                    <div
                        style={{
                            fontSize: 10,
                            color: C.muted,
                            marginBottom: 7,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <GripVertical size={10} /> Long press tab to edit/reorder
                    </div>
                    <div
                        ref={tabScrollRef}
                        style={{
                            display: "flex",
                            gap: 8,
                            overflowX: "auto",
                            padding: 4,
                            paddingBottom: 6,
                            scrollbarWidth: "none",
                        }}
                    >
                        {state.subjects.map((sub, si) => {
                            const isSelected = sub.id === selectedSubId;
                            const isEditMode = editModeSubId === sub.id;
                            const lp = useLongPress(() => setEditModeSubId(sub.id));

                            return (
                                <div key={sub.id} style={{ flexShrink: 0 }}>
                                    <AnimatePresence mode="wait">
                                        {isEditMode ? (
                                            /* Edit mode toolbar */
                                            <motion.div
                                                key="edit"
                                                initial={{ scale: 0.85, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.85, opacity: 0 }}
                                                style={{
                                                    display: "flex",
                                                    gap: 4,
                                                    alignItems: "center",
                                                    background: C.card,
                                                    border: `1px solid ${sub.color}55`,
                                                    borderRadius: 10,
                                                    padding: "4px 6px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        color: sub.color,
                                                        maxWidth: 70,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {sub.name}
                                                </span>
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={() => moveSubject(sub.id, -1)}
                                                    disabled={si === 0}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: si === 0 ? C.border : C.muted,
                                                        cursor: "pointer",
                                                        padding: 2,
                                                    }}
                                                >
                                                    <ChevronUp size={12} />
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={() => moveSubject(sub.id, 1)}
                                                    disabled={si === state.subjects.length - 1}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color:
                                                            si === state.subjects.length - 1
                                                                ? C.border
                                                                : C.muted,
                                                        cursor: "pointer",
                                                        padding: 2,
                                                    }}
                                                >
                                                    <ChevronDown size={12} />
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={() => {
                                                        setEditingSub(sub.id);
                                                        setEditModeSubId(null);
                                                        setShowAddSub(false);
                                                    }}
                                                    style={{
                                                        background: `${C.indigo}22`,
                                                        border: `1px solid ${C.indigo}44`,
                                                        borderRadius: 6,
                                                        color: C.indigo,
                                                        cursor: "pointer",
                                                        padding: "2px 6px",
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    Edit
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={() => deleteSubject(sub.id)}
                                                    style={{
                                                        background: `${C.red}22`,
                                                        border: `1px solid ${C.red}44`,
                                                        borderRadius: 6,
                                                        color: C.red,
                                                        cursor: "pointer",
                                                        padding: "2px 5px",
                                                    }}
                                                >
                                                    <Trash2 size={10} />
                                                </motion.button>
                                                <motion.button
                                                    whileTap={{ scale: 0.85 }}
                                                    onClick={() => setEditModeSubId(null)}
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: C.muted,
                                                        cursor: "pointer",
                                                        padding: 2,
                                                    }}
                                                >
                                                    <X size={11} />
                                                </motion.button>
                                            </motion.div>
                                        ) : (
                                            /* Normal tab */
                                            <motion.button
                                                key="tab"
                                                {...lp}
                                                onClick={() => {
                                                    setSelectedSubId(sub.id);
                                                    setEditModeSubId(null);
                                                }}
                                                style={{
                                                    padding: "7px 14px",
                                                    borderRadius: 10,
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontWeight: 800,
                                                    fontSize: 12,
                                                    whiteSpace: "nowrap",
                                                    background: isSelected ? `${sub.color}28` : C.ghost,
                                                    color: isSelected ? sub.color : C.muted,
                                                    boxShadow: isSelected
                                                        ? `0 0 0 1.5px ${sub.color}77`
                                                        : `0 0 0 1px ${C.border}`,
                                                    transition: "all 0.15s",
                                                    userSelect: "none",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: "50%",
                                                        background: sub.color,
                                                        marginRight: 6,
                                                        verticalAlign: "middle",
                                                    }}
                                                />
                                                {sub.name}
                                            </motion.button>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* No subjects */}
            {state.subjects.length === 0 && !showAddSub && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        textAlign: "center",
                        padding: 42,
                        color: C.muted,
                        fontSize: 13,
                    }}
                >
                    No subjects yet.
                    <br />
                    <span style={{ color: C.accent }}>Add your first subject ↑</span>
                </motion.div>
            )}

            {/* Subject Content */}
            {selectedSub && (
                <SubjectContent
                    key={selectedSub.id}
                    sub={selectedSub}
                    update={update}
                    onConfetti={() => setConfetti(true)}
                />
            )}
        </motion.div>
    );
}
