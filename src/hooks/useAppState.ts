import { useState, useEffect, useCallback } from "react";
import { AppState } from "../lib/types";
import { INITIAL } from "../lib/constants";
import { idbGet, idbSet, idbClear } from "../lib/db";
import { today, migrateSubject } from "../lib/utils";

export function useAppState() {
    // Use a lazy initializer or effect to avoid hydration mismatch with dates in INITIAL
    const [state, setState] = useState<AppState>(INITIAL);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const raw = await idbGet("state");
            if (raw) {
                const s = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (s.lastActive !== today()) {
                    s.completedToday = 0;
                    const diff = s.lastActive
                        ? Math.floor((new Date().getTime() - new Date(s.lastActive).getTime()) / 86400000)
                        : 999;
                    if (diff > 1) s.streak = 0;
                }
                // Migrate subjects
                s.subjects = (s.subjects || []).map(migrateSubject);
                setState({ ...INITIAL, ...s });
            } else {
                // If no state commands, ensures we start with clean INITIAL state, 
                // re-calculating dates on client side to avoid conflicts
                setState(prev => ({
                    ...prev,
                    weeklyData: Array.from({ length: 7 }, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        // We need to match the type structure of WeeklyData
                        // Assuming DAY_NAMES are imported or defined here if needed, 
                        // but they are in constants. Let's import them or just recalculate
                        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                        return { day: days[d.getDay()], xp: 0, lessons: 0 };
                    })
                }));
            }
            setLoaded(true);
        })();
    }, []);

    const save = useCallback(async (ns: AppState) => {
        await idbSet("state", JSON.stringify(ns));
    }, []);

    const markBackupPending = useCallback(async () => {
        await idbSet("backup.pending", "1");
    }, []);

    const update = useCallback(
        (updater: Partial<AppState> | ((prev: AppState) => AppState)) => {
            setState((prev) => {
                const next =
                    typeof updater === "function"
                        ? (updater as Function)(prev)
                        : { ...prev, ...updater };
                save(next);
                markBackupPending();
                return next;
            });
        },
        [save, markBackupPending]
    );

    const importState = useCallback(async (
        data: Partial<AppState>,
        options?: { markBackupPending?: boolean },
    ) => {
        const ns = { ...INITIAL, ...data };
        ns.subjects = (ns.subjects || []).map(migrateSubject);
        await idbClear();
        await idbSet("state", JSON.stringify(ns));
        if (options?.markBackupPending !== false) {
            await markBackupPending();
        }
        setState(ns as AppState);
    }, [markBackupPending]);

    return { state, update, loaded, importState };
}
