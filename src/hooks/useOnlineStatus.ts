"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
    const win = (globalThis as any).window;
    if (!win) return () => { };
    win.addEventListener("online", callback);
    win.addEventListener("offline", callback);
    return () => {
        win.removeEventListener("online", callback);
        win.removeEventListener("offline", callback);
    };
}

function getSnapshot(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerSnapshot(): boolean {
    // On the server we optimistically assume online
    return true;
}

/**
 * Reactive hook that returns `true` when the browser has network connectivity
 * and `false` when offline. Uses the native `online`/`offline` events.
 */
export function useOnlineStatus(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
