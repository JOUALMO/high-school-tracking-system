"use client";

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { C } from "@/lib/constants";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * Slim animated banner that appears when the device has no network.
 * Renders nothing when online.
 */
export function OfflineBanner() {
    const online = useOnlineStatus();

    return (
        <AnimatePresence>
            {!online && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: "hidden", zIndex: 999 }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "1px",
                            // background: `linear-gradient(90deg, ${C.surface}, #1a1a2e)`,
                            // borderBottom: `1px solid ${C.border}`,
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.muted,
                        }}
                    >
                        <WifiOff size={13} style={{
                            color: "#f59e0b", flexShrink: 0,
                            // animation: "pulse-dot 2s ease-in-out infinite",

                        }} />
                        {/* <span>
                                You&apos;re offline — local changes are saved
                            </span> */}
                        {/* <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#f59e0b",
                                animation: "pulse-dot 2s ease-in-out infinite",
                                flexShrink: 0,
                            }}
                        /> */}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
