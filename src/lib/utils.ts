import { AppState, Subject } from "./types";
import { LEVELS } from "./constants";

export const today = () => new Date().toDateString();

export const uid = () => Math.random().toString(36).slice(2, 9);

export function migrateSubject(sub: any): Subject {
    // Convert old frequency-based to scheduleDays
    const scheduleDays =
        sub.scheduleDays !== undefined
            ? sub.scheduleDays
            : sub.frequency === 1
                ? [0, 1, 2, 3, 4, 5, 6]
                : [1, 3, 5]; // default Mon/Wed/Fri

    // Convert flat lessons to units
    const units =
        sub.units !== undefined
            ? sub.units
            : sub.lessons?.length > 0
                ? [{ id: uid(), name: "General", lessons: sub.lessons }]
                : [];

    return { ...sub, scheduleDays, units };
}

export const allLessonsOf = (s: AppState) =>
    (s.subjects || []).flatMap((sub) =>
        (sub.units || []).flatMap((u) => u.lessons || [])
    );

export const levelFor = (xp: number) =>
    [...LEVELS].reverse().find((l) => xp >= l.min) || LEVELS[0];

export const nextLevel = (xp: number) => LEVELS.find((l) => l.min > xp);

export const pctToNext = (xp: number) => {
    const c = levelFor(xp);
    const n = nextLevel(xp);
    return n ? Math.round(((xp - c.min) / (n.min - c.min)) * 100) : 100;
};
