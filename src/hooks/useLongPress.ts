import { useCallback, useRef } from "react";

export function useLongPress(callback: () => void, ms = 600) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fired = useRef(false);

    const start = useCallback(
        (e: any) => {
            fired.current = false;
            timerRef.current = setTimeout(() => {
                fired.current = true;
                callback();
            }, ms);
        },
        [callback, ms]
    );

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    return {
        onMouseDown: start,
        onMouseUp: cancel,
        onMouseLeave: cancel,
        onTouchStart: start,
        onTouchEnd: cancel,
    };
}
