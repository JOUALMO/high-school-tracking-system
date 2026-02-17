import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Plus } from "lucide-react";
import { C, DAY_NAMES } from "@/lib/constants";
import { uid } from "@/lib/utils";
import { Btn } from "@/components/ui/Shared";
import { UnitItem } from "./UnitItem";
import { Subject } from "@/lib/types";

export function SubjectContent({
    sub,
    update,
    onConfetti,
}: {
    sub: Subject;
    update: (updater: any) => void;
    onConfetti: () => void;
}) {
    const [showAddUnit, setShowAddUnit] = useState(false);
    const [newUnitName, setNewUnitName] = useState("");
    const [expandedUnit, setExpandedUnit] = useState<string | null>(
        sub.units?.[0]?.id || null
    );

    const addUnit = () => {
        if (!newUnitName.trim()) return;
        const newUnit = { id: uid(), name: newUnitName.trim(), lessons: [] };
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((x: any) =>
                x.id === sub.id ? { ...x, units: [...x.units, newUnit] } : x
            ),
        }));
        setNewUnitName("");
        setShowAddUnit(false);
        setExpandedUnit(newUnit.id);
    };

    const moveUnit = (uid2: string, dir: number) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((x: any) => {
                if (x.id !== sub.id) return x;
                const units = [...x.units];
                const i = units.findIndex((u) => u.id === uid2);
                const j = i + dir;
                if (j < 0 || j >= units.length) return x;
                [units[i], units[j]] = [units[j], units[i]];
                return { ...x, units };
            }),
        }));
    };

    const deleteUnit = (uid2: string) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((x: any) =>
                x.id === sub.id
                    ? { ...x, units: x.units.filter((u: any) => u.id !== uid2) }
                    : x
            ),
        }));
    };

    const renameUnit = (uid2: string, name: string) => {
        update((s: any) => ({
            ...s,
            subjects: s.subjects.map((x: any) =>
                x.id !== sub.id
                    ? x
                    : {
                        ...x,
                        units: x.units.map((u: any) => (u.id === uid2 ? { ...u, name } : u)),
                    }
            ),
        }));
    };

    const allLessons = (sub.units || []).flatMap((u) => u.lessons || []);
    const done = allLessons.filter((l) => l.status === "done").length;
    const total = allLessons.length;
    const sp = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div>
            {/* Subject summary + schedule days */}
            <div
                style={{
                    background: "linear-gradient(135deg,#14122a,#0c1620)",
                    borderRadius: 14,
                    padding: "12px 16px",
                    border: `1px solid ${sub.color}33`,
                    marginBottom: 14,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                    }}
                >
                    <div
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: sub.color,
                        }}
                    />
                    <span style={{ fontWeight: 900, fontSize: 14, color: sub.color }}>
                        {sub.name}
                    </span>
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: "auto" }}>
                        {done}/{total} lessons done
                    </span>
                </div>
                <div
                    style={{
                        height: 4,
                        background: C.border,
                        borderRadius: 99,
                        marginBottom: 8,
                    }}
                >
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${sp}%` }}
                        transition={{ duration: 0.6 }}
                        style={{ height: "100%", background: sub.color, borderRadius: 99 }}
                    />
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {DAY_NAMES.map((d, i) => (
                        <span
                            key={i}
                            style={{
                                fontSize: 9,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 6,
                                background: (sub.scheduleDays || []).includes(i)
                                    ? `${sub.color}25`
                                    : C.ghost,
                                color: (sub.scheduleDays || []).includes(i)
                                    ? sub.color
                                    : C.border,
                                border: `1px solid ${(sub.scheduleDays || []).includes(i) ? sub.color + "55" : C.border}`,
                            }}
                        >
                            {d.slice(0, 2)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Units */}
            <AnimatePresence>
                {(sub.units || []).map((unit, ui) => (
                    <UnitItem
                        key={unit.id}
                        unit={unit}
                        unitIdx={ui}
                        totalUnits={(sub.units || []).length}
                        subId={sub.id}
                        subColor={sub.color}
                        expandedUnit={expandedUnit}
                        setExpandedUnit={setExpandedUnit}
                        update={update}
                        onMoveUnit={(dir) => moveUnit(unit.id, dir)}
                        onDeleteUnit={() => deleteUnit(unit.id)}
                        onRenameUnit={(name) => renameUnit(unit.id, name)}
                        onConfetti={onConfetti}
                    />
                ))}
            </AnimatePresence>

            {/* Add Unit */}
            <AnimatePresence>
                {showAddUnit ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                            <input
                                value={newUnitName}
                                onChange={(e) => setNewUnitName(e.target.value)}
                                placeholder="Unit name..."
                                onKeyDown={(e) => e.key === "Enter" && addUnit()}
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
                            <Btn style={{ padding: "6px 10px" }} onClick={addUnit}>
                                <Check size={12} />
                            </Btn>
                            <Btn
                                variant="secondary"
                                style={{ padding: "6px 8px" }}
                                onClick={() => setShowAddUnit(false)}
                            >
                                <X size={12} />
                            </Btn>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ marginTop: 10 }}
                    >
                        <Btn
                            variant="ghost"
                            style={{
                                fontSize: 11,
                                width: "100%",
                                justifyContent: "center",
                                border: `1px dashed ${C.border}`,
                                borderRadius: 10,
                                padding: "9px",
                            }}
                            onClick={() => setShowAddUnit(true)}
                        >
                            <Plus size={12} /> Add Unit
                        </Btn>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
