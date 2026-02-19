import { AppState } from "./types";
import { allLessonsOf, today } from "./utils";

export const C = {
    bg: "#050508",
    surface: "#0c0c14",
    card: "#11111c",
    border: "#1c1c2e",
    accent: "#f59e0b",
    indigo: "#818cf8",
    green: "#34d399",
    red: "#f87171",
    pink: "#e879f9",
    text: "#e2e8f0",
    muted: "#52526e",
    ghost: "#16162a",
};

export const SUBJECT_COLORS = [
    "#f59e0b",
    "#818cf8",
    "#34d399",
    "#f87171",
    "#38bdf8",
    "#fb923c",
    "#a78bfa",
    "#4ade80",
    "#f472b6",
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_AR = ["أح", "اث", "ث", "أر", "خ", "ج", "س"];

export const LEVELS = [
    { level: 1, name: "Beginner", min: 0, color: C.muted },
    { level: 2, name: "Student", min: 100, color: C.indigo },
    { level: 3, name: "Scholar", min: 300, color: C.green },
    { level: 4, name: "Expert", min: 600, color: C.accent },
    { level: 5, name: "Master", min: 1000, color: C.pink },
];

export const INITIAL: AppState = {
    ownerUserId: null,
    curriculumId: null,
    curriculumVersion: null,
    curriculumSyncedAt: null,
    subjects: [],
    xp: 0,
    streak: 0,
    lastActive: null,
    completedToday: 0,
    earnedBadges: [],
    sessions: [],
    weeklyData: Array.from({ length: 7 }, (_, i) => {
        // Note: Creating date here might cause hydration mismatch if not handled carefully in components.
        // However, constants are usually evaluated once. 
        // We'll leave it as is for now, but `useAppState` handles initialization mostly.
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { day: DAY_NAMES[d.getDay()], xp: 0, lessons: 0 };
    }),
};

export interface Badge {
    id: string;
    icon: string;
    name: string;
    desc: string;
    req: (s: AppState) => boolean;
}

export const BADGES: Badge[] = [
    {
        id: "first_step",
        icon: "🌟",
        name: "First Step",
        desc: "Complete your first lesson",
        req: (s) => s.xp >= 10,
    },
    {
        id: "on_fire",
        icon: "🔥",
        name: "On Fire",
        desc: "Reach a 3-day streak",
        req: (s) => s.streak >= 3,
    },
    {
        id: "week_warrior",
        icon: "⚔️",
        name: "Week Warrior",
        desc: "Maintain a 7-day streak",
        req: (s) => s.streak >= 7,
    },
    {
        id: "century",
        icon: "💯",
        name: "Century Club",
        desc: "Earn 100 XP",
        req: (s) => s.xp >= 100,
    },
    {
        id: "scholar",
        icon: "📚",
        name: "Scholar",
        desc: "Earn 500 XP",
        req: (s) => s.xp >= 500,
    },
    {
        id: "speed_run",
        icon: "⚡",
        name: "Speed Runner",
        desc: "Complete 5 lessons in one day",
        req: (s) => s.completedToday >= 5,
    },
    {
        id: "half_done",
        icon: "🎯",
        name: "Halfway There",
        desc: "Complete 50% of curriculum",
        req: (s) => {
            const a = allLessonsOf(s);
            return (
                a.length > 0 &&
                a.filter((l) => l.status === "done").length / a.length >= 0.5
            );
        },
    },
    {
        id: "master",
        icon: "👑",
        name: "Curriculum Master",
        desc: "Complete entire curriculum",
        req: (s) => {
            const a = allLessonsOf(s);
            return a.length > 0 && a.every((l) => l.status === "done");
        },
    },
    {
        id: "grinder",
        icon: "⚙️",
        name: "Grinder",
        desc: "Log 5 Lock-in sessions",
        req: (s) => (s.sessions || []).length >= 5,
    },
    {
        id: "time_lord",
        icon: "⌛",
        name: "Time Lord",
        desc: "Study for 300+ minutes total",
        req: (s) =>
            (s.sessions || []).reduce((a, b) => a + (b.duration || 0), 0) >= 300,
    },
];
