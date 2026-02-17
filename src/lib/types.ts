export interface Lesson {
    id: string;
    title: string;
    status: "pending" | "explained" | "solved" | "done";
    xp: number;
}

export interface Unit {
    id: string;
    name: string;
    lessons: Lesson[];
}

export interface Subject {
    id: string;
    name: string;
    color: string;
    scheduleDays: number[];
    units: Unit[];
}

export interface Session {
    id: string;
    subjectId: string;
    duration: number;
    date: string;
}

export interface WeeklyData {
    day: string;
    xp: number;
    lessons: number;
}

export interface AppState {
    subjects: Subject[];
    xp: number;
    streak: number;
    lastActive: string | null;
    completedToday: number;
    earnedBadges: string[];
    sessions: Session[];
    weeklyData: WeeklyData[];
}
