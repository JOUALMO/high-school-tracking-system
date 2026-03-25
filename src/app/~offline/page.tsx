"use client";

import { motion } from "framer-motion";

export default function OfflinePage() {
    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100dvh",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "#f8fafc",
                background: "radial-gradient(circle at center, #111827, #030712)",
                gap: "24px",
                textAlign: "center",
                padding: "24px",
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}
            >
                <motion.div
                    animate={{
                        y: [0, -15, 0],
                        opacity: [0.8, 1, 0.8]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        fontSize: "4.5rem",
                        filter: "drop-shadow(0 0 25px rgba(59, 130, 246, 0.3))"
                    }}
                >
                    📡
                </motion.div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h1 style={{
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        margin: 0,
                        background: "linear-gradient(to bottom, #ffffff, #94a3b8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent"
                    }}>
                        لا يوجد اتصال بالإنترنت
                    </h1>
                    <p style={{
                        color: "#94a3b8",
                        margin: 0,
                        fontSize: "1rem",
                        maxWidth: "300px",
                        lineHeight: 1.6,
                        fontWeight: 400
                    }}>
                        يبدو أنك غير متصل بالشبكة حالياً. يرجى التحقق من اتصالك والمحاولة مرة أخرى.
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => (globalThis as any).window?.location.reload()}
                    style={{
                        marginTop: "12px",
                        padding: "12px 32px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        background: "rgba(255, 255, 255, 0.05)",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        backdropFilter: "blur(12px)",
                        fontSize: "0.95rem",
                        transition: "all 0.2s ease"
                    }}
                >
                    إعادة المحاولة
                </motion.button>
            </motion.div>
        </main>
    );
}