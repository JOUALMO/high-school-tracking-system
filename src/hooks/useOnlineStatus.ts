"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
    };
}

function getSnapshot(): boolean {
    return navigator.onLine;
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
