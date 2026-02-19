import Link from "next/link";
import { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { C } from "@/lib/constants";

export const authInputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.ghost,
  color: C.text,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
};

export const authLabelStyle: CSSProperties = {
  color: C.muted,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.25,
  marginBottom: 6,
};

export const authButtonStyle: CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: `1px solid ${C.accent}55`,
  background: C.accent,
  color: "#0b0b0f",
  padding: "10px 12px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

export function AuthLayout({
  title,
  subtitle,
  children,
  switchText,
  switchHref,
  switchLabel,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  switchText: string;
  switchHref: string;
  switchLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "8%",
          left: "12%",
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accent}12, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.95, 0.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 1.3 }}
        style={{
          position: "absolute",
          bottom: "10%",
          right: "8%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.indigo}10, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          background: C.surface,
          padding: 20,
          position: "relative",
          zIndex: 1,
          boxShadow: "0 18px 45px rgba(0, 0, 0, 0.35)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{title}</h1>
          <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 13 }}>{subtitle}</p>
        </div>

        {children}

        <p style={{ margin: "14px 0 0", color: C.muted, fontSize: 12 }}>
          {switchText}{" "}
          <Link
            href={switchHref}
            style={{ color: C.indigo, fontWeight: 700, textDecoration: "none" }}
          >
            {switchLabel}
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}

export function AuthMessage({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  return (
    <p
      style={{
        margin: "0 0 12px",
        borderRadius: 10,
        border: `1px solid ${type === "success" ? `${C.green}44` : `${C.red}44`}`,
        background: type === "success" ? `${C.green}1a` : `${C.red}1a`,
        color: type === "success" ? C.green : C.red,
        padding: "9px 11px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {text}
    </p>
  );
}
