import { useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { C, SUBJECT_COLORS } from "@/lib/constants";
import { Card, Btn } from "@/components/ui/Shared";
import { DaySelector } from "@/components/ui/DaySelector";
import { Subject } from "@/lib/types";

export function SubjectForm({
    initial,
    onSave,
    onCancel,
    title = "NEW SUBJECT",
}: {
    initial?: Subject;
    onSave: (data: { name: string; color: string; scheduleDays: number[] }) => void;
    onCancel: () => void;
    title?: string;
}) {
    const [name, setName] = useState(initial?.name || "");
    const [scheduleDays, setScheduleDays] = useState(initial?.scheduleDays || []);
    const [colorIdx, setColorIdx] = useState(
        initial?.color ? SUBJECT_COLORS.indexOf(initial.color) : 0
    );

    const save = () => {
        if (!name.trim()) return;
        onSave({
            name: name.trim(),
            color: SUBJECT_COLORS[colorIdx < 0 ? 0 : colorIdx],
            scheduleDays,
        });
    };

    return (
        <Card noAnim style={{ border: `1px solid ${C.accent}55` }}>
            <h4
                style={{
                    color: C.accent,
                    fontWeight: 800,
                    marginBottom: 12,
                    fontSize: 11,
                    letterSpacing: 1,
                }}
            >
                {title}
            </h4>
            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Subject name..."
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
                style={{
                    width: "100%",
                    background: C.ghost,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: C.text,
                    fontSize: 13,
                    marginBottom: 12,
                    boxSizing: "border-box",
                    outline: "none",
                }}
            />

            <div
                style={{
                    display: "flex",
                    gap: 7,
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <span style={{ fontSize: 11, color: C.muted }}>Color:</span>
                {SUBJECT_COLORS.slice(0, 6).map((c, i) => (
                    <motion.div
                        key={c}
                        whileHover={{ scale: 1.25 }}
                        onClick={() => setColorIdx(i)}
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: c,
                            cursor: "pointer",
                            border:
                                colorIdx === i ? "2px solid white" : "2px solid transparent",
                        }}
                    />
                ))}
            </div>

            <div style={{ marginBottom: 14 }}>
                <span
                    style={{
                        fontSize: 11,
                        color: C.muted,
                        display: "block",
                        marginBottom: 7,
                    }}
                >
                    Study days:
                </span>
                <DaySelector value={scheduleDays} onChange={setScheduleDays} />
                {scheduleDays.length === 0 && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 5 }}>
                        ⚠ Select at least one day
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <Btn
                    onClick={save}
                    disabled={!name.trim() || scheduleDays.length === 0}
                >
                    <Save size={12} /> Save
                </Btn>
                <Btn variant="secondary" onClick={onCancel}>
                    Cancel
                </Btn>
            </div>
        </Card>
    );
}
