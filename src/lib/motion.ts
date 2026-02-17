export const page = {
    initial: { opacity: 0, y: 22, scale: 0.98 },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
    },
    exit: { opacity: 0, y: -14, scale: 0.98, transition: { duration: 0.18 } },
};

export const card = (i = 0) => ({
    initial: { opacity: 0, y: 18 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.33, ease: [0.22, 1, 0.36, 1] as const },
    },
});

export const pop = {
    initial: { scale: 0, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring" as const, stiffness: 400, damping: 18 },
    },
};
