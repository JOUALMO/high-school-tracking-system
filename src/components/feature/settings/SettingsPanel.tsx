import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Upload, X } from "lucide-react";
import { C } from "@/lib/constants";
import { allLessonsOf } from "@/lib/utils";
import { AppState } from "@/lib/types";
import { Btn } from "@/components/ui/Shared";
import { pop } from "@/lib/motion";

export function SettingsPanel({
    state,
    importState,
    onClose,
}: {
    state: AppState;
    importState: (data: any) => Promise<void>;
    onClose: () => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [msg, setMsg] = useState("");
    // const [importErrorDetails, setImportErrorDetails] = useState(null);

    const doExport = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `studyflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMsg("✅ Exported successfully!");
    };

    const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".json") && file.type !== "application/json") {
            setMsg("❌ Please select a .json file.");
            return;
        }

        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr: any) {
                console.error("JSON parse error:", parseErr);
                throw new Error(`JSON parse error: ${parseErr.message}`);
            }

            const validationErrors = validateBackup(data);
            if (validationErrors.length > 0) {
                console.error("Backup validation failed:", validationErrors);
                throw new Error("Validation failed: " + validationErrors.join("; "));
            }

            await importState(data);
            setMsg("✅ Imported! Data restored.");
            // setImportErrorDetails(null);
        } catch (err: any) {
            console.error("Import failed:", err);
            setMsg(`❌ Invalid backup: ${err.message || String(err)}`);
            // setImportErrorDetails({ ... });
        }
    };

    function validateBackup(data: any) {
        const errors: string[] = [];
        if (typeof data !== "object" || data === null) {
            errors.push("root must be an object");
            return errors;
        }

        if (!("subjects" in data)) {
            errors.push("missing required property: subjects");
        } else if (!Array.isArray(data.subjects)) {
            errors.push("subjects must be an array");
        }

        return errors;
    }

    const allLessons = allLessonsOf(state);
    const totalMins = (state.sessions || []).reduce(
        (a, b) => a + (b.duration || 0),
        0
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.75)",
                zIndex: 200,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "20px 20px 0 0",
                    padding: 26,
                    width: "100%",
                    maxWidth: 520,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                    }}
                >
                    <h3 style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>
                        ⚙️ Data Management
                    </h3>
                    <Btn variant="ghost" onClick={onClose} style={{ padding: "4px 8px" }}>
                        <X size={15} />
                    </Btn>
                </div>
                <p
                    style={{
                        color: C.muted,
                        fontSize: 12,
                        marginBottom: 18,
                        lineHeight: 1.7,
                    }}
                >
                    Data is cached locally in{" "}
                    <strong style={{ color: C.indigo }}>IndexedDB</strong> on this device,
                    and user accounts can sync backups to the server.
                </p>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        marginBottom: 14,
                    }}
                >
                    <Btn
                        variant="green"
                        onClick={doExport}
                        style={{ justifyContent: "center", padding: "12px" }}
                    >
                        <Download size={14} /> Export JSON
                    </Btn>
                    <Btn
                        variant="indigo"
                        onClick={() => fileRef.current?.click()}
                        style={{ justifyContent: "center", padding: "12px" }}
                    >
                        <Upload size={14} /> Import JSON
                    </Btn>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={doImport}
                />
                <AnimatePresence>
                    {msg && (
                        <motion.p
                            {...pop}
                            style={{
                                textAlign: "center",
                                fontSize: 12,
                                color: msg.startsWith("✅") ? C.green : C.red,
                                padding: "8px 12px",
                                background: msg.startsWith("✅")
                                    ? `${C.green}18`
                                    : `${C.red}18`,
                                borderRadius: 8,
                                marginBottom: 12,
                            }}
                        >
                            {msg}
                        </motion.p>
                    )}
                </AnimatePresence>
                <div
                    style={{
                        background: C.ghost,
                        borderRadius: 12,
                        border: `1px solid ${C.border}`,
                        padding: "12px 16px",
                    }}
                >
                    <div
                        style={{
                            fontSize: 10,
                            color: C.muted,
                            fontWeight: 700,
                            letterSpacing: 1,
                            marginBottom: 8,
                        }}
                    >
                        STORED DATA
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                        {[
                            { l: "Subjects", v: state.subjects.length },
                            { l: "Lessons", v: allLessons.length },
                            { l: "XP", v: state.xp },
                            { l: "Sessions", v: (state.sessions || []).length },
                            { l: "Study time", v: `${totalMins}m` },
                        ].map(({ l, v }) => (
                            <div key={l} style={{ textAlign: "center" }}>
                                <div style={{ color: C.accent, fontWeight: 900, fontSize: 16 }}>
                                    {v}
                                </div>
                                <div style={{ color: C.muted, fontSize: 9, fontWeight: 700 }}>
                                    {l.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
