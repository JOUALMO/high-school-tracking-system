import { motion } from "framer-motion";
import { C } from "@/lib/constants";
import { levelFor, nextLevel, pctToNext } from "@/lib/utils";
import { useEffect, useState } from "react";

// ─── CARD component
export const Card = ({
    children,
    style,
    onClick,
    delay = 0,
    noAnim = false,
}: {
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
    delay?: number;
    noAnim?: boolean;
}) => {
    const variants = (i = 0) => ({
        initial: { opacity: 0, y: 18 },
        animate: {
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.06, duration: 0.33, ease: [0.22, 1, 0.36, 1] as const },
        },
    });

    return (
        <motion.div
            variants={noAnim ? undefined : variants(delay)}
            initial={noAnim ? undefined : "initial"}
            animate={noAnim ? undefined : "animate"}
            onClick={onClick}
            style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 16,
                ...style,
            }}
            className={onClick ? "cursor-pointer" : ""}
        >
            {children}
        </motion.div>
    );
};

// ─── PILL component
export const Pill = ({
    children,
    color = C.accent,
}: {
    children: React.ReactNode;
    color?: string;
}) => (
    <span
        style={{
            background: `${color}22`,
            color,
            border: `1px solid ${color}44`,
            borderRadius: 99,
            fontSize: 11,
            padding: "2px 9px",
            fontWeight: 700,
        }}
    >
        {children}
    </span>
);

// ─── BUTTON component
export const Btn = ({
    children,
    onClick,
    variant = "primary",
    style,
    disabled,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger" | "ghost" | "green" | "indigo";
    style?: React.CSSProperties;
    disabled?: boolean;
}) => {
    const base: React.CSSProperties = {
        borderRadius: 10,
        padding: "8px 16px",
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
    };
    const V: Record<string, React.CSSProperties> = {
        primary: { background: C.accent, color: "#000" },
        secondary: {
            background: C.ghost,
            color: C.text,
            border: `1px solid ${C.border}`,
        },
        danger: {
            background: `${C.red}22`,
            color: C.red,
            border: `1px solid ${C.red}44`,
        },
        ghost: { background: "transparent", color: C.muted },
        green: {
            background: `${C.green}22`,
            color: C.green,
            border: `1px solid ${C.green}44`,
        },
        indigo: {
            background: `${C.indigo}22`,
            color: C.indigo,
            border: `1px solid ${C.indigo}44`,
        },
    };
    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            style={{ ...base, ...V[variant], ...style }}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
        >
            {children}
        </motion.button>
    );
};

// ─── XPBar component
export function XPBar({ xp }: { xp: number }) {
    const cur = levelFor(xp);
    const nxt = nextLevel(xp);
    const pct = pctToNext(xp);
    return (
        <div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                }}
            >
                <span style={{ color: cur.color, fontWeight: 800, fontSize: 12 }}>
                    Lv.{cur.level} — {cur.name}
                </span>
                <span style={{ color: C.muted, fontSize: 11 }}>
                    {nxt ? `${xp} / ${nxt.min} XP` : "MAX LEVEL"}
                </span>
            </div>
            <div
                style={{
                    background: C.border,
                    borderRadius: 99,
                    height: 5,
                    overflow: "hidden",
                }}
            >
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
                    style={{
                        background: `linear-gradient(90deg,${cur.color},${nxt?.color || cur.color})`,
                        height: "100%",
                        borderRadius: 99,
                    }}
                />
            </div>
        </div>
    );
}

// ─── CONFETTI component
export function Confetti({ onDone }: { onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 1300);
        return () => clearTimeout(t);
    }, [onDone]);
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {Array.from({ length: 20 }, (_, i) => (
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                        x: Math.cos((i / 20) * Math.PI * 2) * 120,
                        y: Math.sin((i / 20) * Math.PI * 2) * 100 - 60,
                        opacity: 0,
                        scale: 0,
                    }}
                    transition={{
                        duration: 0.9,
                        delay: Math.random() * 0.1,
                        ease: "easeOut",
                    }}
                    style={{
                        position: "absolute",
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: [
                            C.accent,
                            C.indigo,
                            C.green,
                            C.pink,
                            "#38bdf8",
                            "#fb923c",
                        ][i % 6],
                    }}
                />
            ))}
        </div>
    );
}
