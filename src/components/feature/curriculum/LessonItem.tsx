import { useState } from "react";
import { motion } from "framer-motion";
import {
    Save,
    ChevronUp,
    ChevronDown,
    Trash2,
    X,
    Circle,
    BookOpen,
    Edit3,
    CheckCircle,
} from "lucide-react";
import { C } from "@/lib/constants";
import { useLongPress } from "@/hooks/useLongPress";
import { Lesson } from "@/lib/types";

export function LessonItem({
    lesson: l,
    lesIdx,
    totalLes,
    SC,
    SI,
    SL,
    onCycle,
    onDelete,
    onMove,
    onRename,
}: {
    lesson: Lesson;
    lesIdx: number;
    totalLes: number;
    SC: any;
    SI: any;
    SL: any;
    onCycle: () => void;
    onDelete: () => void;
    onMove: (dir: number) => void;
    onRename: (name: string) => void;
}) {
    const [editMode, setEditMode] = useState(false);
    const [editTitle, setEditTitle] = useState(l.title);

    const lp = useLongPress(() => setEditMode(true));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 0",
                borderBottom: `1px solid ${C.border}`,
            }}
        >
            {editMode ? (
                <>
                    <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                onRename(editTitle);
                                setEditMode(false);
                            }
                        }}
                        style={{
                            flex: 1,
                            background: C.ghost,
                            border: `1px solid ${C.border}`,
                            borderRadius: 7,
                            padding: "3px 8px",
                            color: C.text,
                            fontSize: 11,
                            outline: "none",
                        }}
                    />
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => {
                            onRename(editTitle);
                            setEditMode(false);
                        }}
                        style={{
                            background: `${C.green}22`,
                            border: `1px solid ${C.green}44`,
                            borderRadius: 6,
                            color: C.green,
                            cursor: "pointer",
                            padding: "3px 6px",
                        }}
                    >
                        <Save size={10} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onMove(-1)}
                        disabled={lesIdx === 0}
                        style={{
                            background: C.ghost,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            color: lesIdx === 0 ? C.border : C.muted,
                            cursor: "pointer",
                            padding: "3px 5px",
                        }}
                    >
                        <ChevronUp size={10} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => onMove(1)}
                        disabled={lesIdx === totalLes - 1}
                        style={{
                            background: C.ghost,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            color: lesIdx === totalLes - 1 ? C.border : C.muted,
                            cursor: "pointer",
                            padding: "3px 5px",
                        }}
                    >
                        <ChevronDown size={10} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={onDelete}
                        style={{
                            background: `${C.red}22`,
                            border: "none",
                            borderRadius: 6,
                            color: C.red,
                            cursor: "pointer",
                            padding: "3px 5px",
                        }}
                    >
                        <Trash2 size={10} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setEditMode(false)}
                        style={{
                            background: "none",
                            border: "none",
                            color: C.muted,
                            cursor: "pointer",
                            padding: "3px 4px",
                        }}
                    >
                        <X size={10} />
                    </motion.button>
                </>
            ) : (
                <>
                    <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={onCycle}
                        style={{
                            color: SC[l.status],
                            background: `${SC[l.status]}22`,
                            border: `1px solid ${SC[l.status]}44`,
                            borderRadius: 7,
                            padding: "3px 8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {SI[l.status]} {SL[l.status]}
                    </motion.button>
                    <span
                        {...lp}
                        style={{
                            flex: 1,
                            color: l.status === "done" ? C.muted : C.text,
                            fontSize: 12,
                            textDecoration: l.status === "done" ? "line-through" : "none",
                            cursor: "default",
                            userSelect: "none",
                        }}
                    >
                        {l.title}
                    </span>
                    <span style={{ fontSize: 10, color: C.indigo }}>+{l.xp}</span>
                </>
            )}
        </motion.div>
    );
}
