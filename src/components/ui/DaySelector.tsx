import { motion } from "framer-motion";
import { C, DAY_NAMES } from "@/lib/constants";

export function DaySelector({
    value = [],
    onChange,
}: {
    value: number[];
    onChange: (days: number[]) => void;
}) {
    const toggle = (d: number) =>
        onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
    return (
        <div style={{ display: "flex", gap: 5 }}>
            {DAY_NAMES.map((d, i) => (
                <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggle(i)}
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: 10,
                        background: value.includes(i) ? `${C.accent}33` : C.ghost,
                        color: value.includes(i) ? C.accent : C.muted,
                        boxShadow: value.includes(i)
                            ? `0 0 0 1.5px ${C.accent}88`
                            : `0 0 0 1px ${C.border}`,
                        transition: "all 0.15s",
                    }}
                >
                    {d.slice(0, 2)}
                </motion.button>
            ))}
        </div>
    );
}
