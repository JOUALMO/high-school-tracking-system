import { randomUUID } from "crypto";

const DEFAULT_COLORS = [
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

export interface RawCurriculumLesson {
  id: string;
  title: string;
}

export interface RawCurriculumUnit {
  id: string;
  name: string;
  lessons: RawCurriculumLesson[];
}

export interface RawCurriculumSubject {
  id: string;
  name: string;
  color: string;
  scheduleDays: number[];
  units: RawCurriculumUnit[];
}

export interface RawCurriculumData {
  subjects: RawCurriculumSubject[];
}

export function sanitizeCurriculumData(input: unknown): RawCurriculumData {
  const subjectsSource = getSubjectsSource(input);
  const subjects = subjectsSource.map((value, index) => sanitizeSubject(value, index));

  return { subjects };
}

function getSubjectsSource(input: unknown): unknown[] {
  if (Array.isArray(input)) {
    return input;
  }

  const record = asObject(input);
  if (!record) {
    return [];
  }

  return Array.isArray(record.subjects) ? record.subjects : [];
}

function sanitizeSubject(value: unknown, subjectIndex: number): RawCurriculumSubject {
  const record = asObject(value) ?? {};
  const subjectId = readString(record.id) || makeId("sub");
  const subjectName = readString(record.name) || `Subject ${subjectIndex + 1}`;
  const subjectColor = readString(record.color) || DEFAULT_COLORS[subjectIndex % DEFAULT_COLORS.length];
  const scheduleDays = normalizeScheduleDays(record.scheduleDays);
  const units = sanitizeSubjectUnits(record);

  return {
    id: subjectId,
    name: subjectName,
    color: subjectColor,
    scheduleDays,
    units,
  };
}

function sanitizeSubjectUnits(subject: Record<string, unknown>): RawCurriculumUnit[] {
  const unitsRaw = Array.isArray(subject.units) ? subject.units : [];

  if (unitsRaw.length > 0) {
    return unitsRaw.map((value, index) => sanitizeUnit(value, index));
  }

  const legacyLessons = Array.isArray(subject.lessons) ? subject.lessons : [];
  if (legacyLessons.length === 0) {
    return [];
  }

  return [
    {
      id: makeId("uni"),
      name: "General",
      lessons: legacyLessons.map((lesson, index) => sanitizeLesson(lesson, index)),
    },
  ];
}

function sanitizeUnit(value: unknown, unitIndex: number): RawCurriculumUnit {
  const record = asObject(value) ?? {};
  const lessonsRaw = Array.isArray(record.lessons) ? record.lessons : [];

  return {
    id: readString(record.id) || makeId("uni"),
    name: readString(record.name) || `Unit ${unitIndex + 1}`,
    lessons: lessonsRaw.map((lesson, lessonIndex) => sanitizeLesson(lesson, lessonIndex)),
  };
}

function sanitizeLesson(value: unknown, lessonIndex: number): RawCurriculumLesson {
  const record = asObject(value) ?? {};

  return {
    id: readString(record.id) || makeId("les"),
    title: readString(record.title) || `Lesson ${lessonIndex + 1}`,
  };
}

function normalizeScheduleDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<number>();
  for (const item of value) {
    const day = Number(item);
    if (Number.isInteger(day) && day >= 0 && day <= 6) {
      seen.add(day);
    }
  }

  return [...seen].sort((a, b) => a - b);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function makeId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}
