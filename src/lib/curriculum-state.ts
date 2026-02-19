import { DAY_NAMES, INITIAL, SUBJECT_COLORS } from "@/lib/constants";
import { apiRequest } from "@/lib/auth-client";
import { getLatestBackup } from "@/lib/backup-client";
import { idbGet, idbSet } from "@/lib/db";
import { AppState, Lesson, Subject, Unit } from "@/lib/types";
import { uid } from "@/lib/utils";

const CURRICULUM_BASE_KEY = "curriculum.base";

interface RawLesson {
  id: string;
  title: string;
}

interface RawUnit {
  id: string;
  name: string;
  lessons: RawLesson[];
}

interface RawSubject {
  id: string;
  name: string;
  color: string;
  scheduleDays: number[];
  units: RawUnit[];
}

interface RawCurriculumData {
  subjects: RawSubject[];
}

interface CurriculumBaseSnapshot {
  curriculumId: string;
  version: number;
  updatedAt: string;
  data: RawCurriculumData;
}

interface RemoteCurriculum {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
  data: unknown;
}

interface SelectedCurriculumResponse {
  curriculum: RemoteCurriculum | null;
}

interface BootstrapResponse {
  curriculum: RemoteCurriculum | null;
  backup:
    | {
        id: string;
        createdAt: string;
        state: unknown;
      }
    | null;
}

export async function syncSelectedCurriculumToIndexedDb(
  previousState?: AppState | null,
): Promise<AppState | null> {
  const next = await fetchSelectedCurriculumAppState(previousState);
  if (!next) {
    return null;
  }

  await idbSet("state", JSON.stringify(next));
  return next;
}

export async function syncUserStateFromServer(
  options?: { ownerUserId?: string | null },
): Promise<AppState | null> {
  const ownerUserId =
    typeof options?.ownerUserId === "string" && options.ownerUserId.trim().length > 0
      ? options.ownerUserId
      : null;
  let backupState: AppState | null = null;
  let remoteCurriculum: RemoteCurriculum | null = null;

  try {
    const bootstrap = await apiRequest<BootstrapResponse>("/curricula/bootstrap");
    backupState = coerceAppState(bootstrap.backup?.state ?? null);
    remoteCurriculum = bootstrap.curriculum;
  } catch {
    // Backward-compatible fallback when bootstrap route is unavailable.
    try {
      const latestBackup = await getLatestBackup();
      backupState = coerceAppState(latestBackup.backup?.state ?? null);
    } catch {
      backupState = null;
    }

    const selected = await apiRequest<SelectedCurriculumResponse>("/curricula/selected");
    remoteCurriculum = selected.curriculum;
  }

  const now = new Date().toISOString();

  if (remoteCurriculum) {
    const remoteRaw = normalizeRawCurriculumData(remoteCurriculum.data);
    await writeBaseSnapshot({
      curriculumId: remoteCurriculum.id,
      version: remoteCurriculum.version,
      updatedAt: remoteCurriculum.updatedAt,
      data: remoteRaw,
    });

    if (
      backupState &&
      typeof backupState.curriculumId === "string" &&
      backupState.curriculumId === remoteCurriculum.id
    ) {
      const restoredFromBackup: AppState = {
        ...INITIAL,
        ...backupState,
        ownerUserId: ownerUserId ?? backupState.ownerUserId,
        curriculumId: remoteCurriculum.id,
        curriculumVersion: remoteCurriculum.version,
        curriculumSyncedAt: now,
        weeklyData:
          Array.isArray(backupState.weeklyData) && backupState.weeklyData.length === 7
            ? backupState.weeklyData
            : createEmptyWeeklyData(),
      };
      await idbSet("state", JSON.stringify(restoredFromBackup));
      return restoredFromBackup;
    }

    const adminDefault = buildAppStateFromCurriculumData(
      remoteCurriculum.id,
      remoteCurriculum.data,
      null,
      {
        curriculumVersion: remoteCurriculum.version,
        curriculumSyncedAt: now,
      },
    );
    const defaultForUser: AppState = {
      ...adminDefault,
      ownerUserId: ownerUserId ?? adminDefault.ownerUserId,
    };
    await idbSet("state", JSON.stringify(defaultForUser));
    return defaultForUser;
  }

  if (backupState) {
    const restored: AppState = {
      ...INITIAL,
      ...backupState,
      ownerUserId: ownerUserId ?? backupState.ownerUserId,
      weeklyData:
        Array.isArray(backupState.weeklyData) && backupState.weeklyData.length === 7
          ? backupState.weeklyData
          : createEmptyWeeklyData(),
    };
    await idbSet("state", JSON.stringify(restored));
    return restored;
  }

  return null;
}

export async function fetchSelectedCurriculumAppState(
  previousState?: AppState | null,
): Promise<AppState | null> {
  const response = await apiRequest<SelectedCurriculumResponse>("/curricula/selected");
  return mergeWithRemoteCurriculum(response.curriculum, previousState);
}

async function mergeWithRemoteCurriculum(
  curriculum: RemoteCurriculum | null,
  previousState?: AppState | null,
): Promise<AppState | null> {
  if (!curriculum) {
    return null;
  }

  const response = { curriculum };
  const existing = previousState ?? (await readStoredAppState());
  const remoteRaw = normalizeRawCurriculumData(response.curriculum.data);
  const baseSnapshot = await readBaseSnapshot();
  const now = new Date().toISOString();

  let nextState: AppState;

  if (existing && existing.curriculumId === response.curriculum.id) {
    const localRaw = rawFromSubjects(existing.subjects || []);
    let mergedRaw: RawCurriculumData;

    if (
      baseSnapshot &&
      baseSnapshot.curriculumId === response.curriculum.id &&
      baseSnapshot.version === response.curriculum.version
    ) {
      mergedRaw = localRaw;
    } else if (
      baseSnapshot &&
      baseSnapshot.curriculumId === response.curriculum.id
    ) {
      mergedRaw = mergeRawCurriculumWithBase(
        baseSnapshot.data,
        localRaw,
        remoteRaw,
      );
    } else {
      mergedRaw = mergeRawCurriculumPreferLocal(remoteRaw, localRaw);
    }

    nextState = {
      ...INITIAL,
      ...existing,
      curriculumId: response.curriculum.id,
      curriculumVersion: response.curriculum.version,
      curriculumSyncedAt: now,
      subjects: hydrateSubjectsFromRaw(mergedRaw, existing.subjects || []),
      weeklyData:
        Array.isArray(existing.weeklyData) && existing.weeklyData.length === 7
          ? existing.weeklyData
          : createEmptyWeeklyData(),
    };
  } else {
    nextState = {
      ...INITIAL,
      curriculumId: response.curriculum.id,
      curriculumVersion: response.curriculum.version,
      curriculumSyncedAt: now,
      subjects: hydrateSubjectsFromRaw(remoteRaw, []),
      weeklyData: createEmptyWeeklyData(),
    };
  }

  await writeBaseSnapshot({
    curriculumId: response.curriculum.id,
    version: response.curriculum.version,
    updatedAt: response.curriculum.updatedAt,
    data: remoteRaw,
  });

  return nextState;
}

export function buildAppStateFromCurriculumData(
  curriculumId: string,
  data: unknown,
  existing: AppState | null,
  options?: { curriculumVersion?: number | null; curriculumSyncedAt?: string | null },
): AppState {
  const raw = normalizeRawCurriculumData(data);
  const now = options?.curriculumSyncedAt ?? new Date().toISOString();
  const version =
    typeof options?.curriculumVersion === "number"
      ? options.curriculumVersion
      : null;

  if (existing && existing.curriculumId === curriculumId) {
    return {
      ...INITIAL,
      ...existing,
      curriculumId,
      curriculumVersion: version,
      curriculumSyncedAt: now,
      subjects: hydrateSubjectsFromRaw(raw, existing.subjects || []),
      weeklyData:
        Array.isArray(existing.weeklyData) && existing.weeklyData.length === 7
          ? existing.weeklyData
          : createEmptyWeeklyData(),
    };
  }

  if (existing) {
    return {
      ...INITIAL,
      ...existing,
      curriculumId,
      curriculumVersion: version,
      curriculumSyncedAt: now,
      subjects: hydrateSubjectsFromRaw(raw, existing.subjects || []),
      weeklyData:
        Array.isArray(existing.weeklyData) && existing.weeklyData.length === 7
          ? existing.weeklyData
          : createEmptyWeeklyData(),
    };
  }

  return {
    ...INITIAL,
    curriculumId,
    curriculumVersion: version,
    curriculumSyncedAt: now,
    subjects: hydrateSubjectsFromRaw(raw, []),
    weeklyData: createEmptyWeeklyData(),
  };
}

export function extractRawCurriculumFromAppState(state: AppState): RawCurriculumData {
  return rawFromSubjects(state.subjects || []);
}

function hydrateSubjectsFromRaw(
  raw: RawCurriculumData,
  previousSubjects: Subject[],
): Subject[] {
  const progressByLessonId = new Map<
    string,
    Pick<Lesson, "status" | "xp" | "completedAt">
  >();

  for (const subject of previousSubjects || []) {
    for (const unit of subject.units || []) {
      for (const lesson of unit.lessons || []) {
        progressByLessonId.set(lesson.id, {
          status: lesson.status,
          xp: lesson.xp,
          completedAt: lesson.completedAt,
        });
      }
    }
  }

  return raw.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color,
    scheduleDays: [...subject.scheduleDays],
    units: subject.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      lessons: unit.lessons.map((lesson) => {
        const existing = progressByLessonId.get(lesson.id);
        return {
          id: lesson.id,
          title: lesson.title,
          status: existing?.status ?? "pending",
          xp:
            existing && Number.isFinite(existing.xp) ? existing.xp : 10,
          completedAt: existing?.completedAt,
        } satisfies Lesson;
      }),
    })),
  }));
}

function mergeRawCurriculumWithBase(
  base: RawCurriculumData,
  local: RawCurriculumData,
  remote: RawCurriculumData,
): RawCurriculumData {
  const baseSubjects = mapById(base.subjects);
  const localSubjects = mapById(local.subjects);
  const remoteSubjectIds = new Set(remote.subjects.map((subject) => subject.id));

  const mergedSubjects: RawSubject[] = remote.subjects.map((remoteSubject) => {
    const baseSubject = baseSubjects.get(remoteSubject.id);
    const localSubject = localSubjects.get(remoteSubject.id);
    return mergeSubjectWithBase(baseSubject, localSubject, remoteSubject);
  });

  for (const localSubject of local.subjects) {
    if (remoteSubjectIds.has(localSubject.id)) {
      continue;
    }

    const baseSubject = baseSubjects.get(localSubject.id);
    if (!baseSubject) {
      mergedSubjects.push(localSubject);
      continue;
    }

    if (subjectChanged(localSubject, baseSubject)) {
      mergedSubjects.push(localSubject);
    }
  }

  return { subjects: mergedSubjects };
}

function mergeSubjectWithBase(
  base: RawSubject | undefined,
  local: RawSubject | undefined,
  remote: RawSubject,
): RawSubject {
  const merged: RawSubject = {
    id: remote.id,
    name: pickLocalChange(local?.name, base?.name, remote.name),
    color: pickLocalChange(local?.color, base?.color, remote.color),
    scheduleDays: pickLocalScheduleDays(local?.scheduleDays, base?.scheduleDays, remote.scheduleDays),
    units: [],
  };

  const baseUnits = mapById(base?.units || []);
  const localUnits = mapById(local?.units || []);
  const remoteUnitIds = new Set(remote.units.map((unit) => unit.id));

  merged.units = remote.units.map((remoteUnit) => {
    const baseUnit = baseUnits.get(remoteUnit.id);
    const localUnit = localUnits.get(remoteUnit.id);
    return mergeUnitWithBase(baseUnit, localUnit, remoteUnit);
  });

  for (const localUnit of local?.units || []) {
    if (remoteUnitIds.has(localUnit.id)) {
      continue;
    }

    const baseUnit = baseUnits.get(localUnit.id);
    if (!baseUnit) {
      merged.units.push(localUnit);
      continue;
    }

    if (unitChanged(localUnit, baseUnit)) {
      merged.units.push(localUnit);
    }
  }

  return merged;
}

function mergeUnitWithBase(
  base: RawUnit | undefined,
  local: RawUnit | undefined,
  remote: RawUnit,
): RawUnit {
  const merged: RawUnit = {
    id: remote.id,
    name: pickLocalChange(local?.name, base?.name, remote.name),
    lessons: [],
  };

  const baseLessons = mapById(base?.lessons || []);
  const localLessons = mapById(local?.lessons || []);
  const remoteLessonIds = new Set(remote.lessons.map((lesson) => lesson.id));

  merged.lessons = remote.lessons.map((remoteLesson) => {
    const baseLesson = baseLessons.get(remoteLesson.id);
    const localLesson = localLessons.get(remoteLesson.id);
    return {
      id: remoteLesson.id,
      title: pickLocalChange(localLesson?.title, baseLesson?.title, remoteLesson.title),
    };
  });

  for (const localLesson of local?.lessons || []) {
    if (remoteLessonIds.has(localLesson.id)) {
      continue;
    }

    const baseLesson = baseLessons.get(localLesson.id);
    if (!baseLesson || localLesson.title !== baseLesson.title) {
      merged.lessons.push(localLesson);
    }
  }

  return merged;
}

function mergeRawCurriculumPreferLocal(
  remote: RawCurriculumData,
  local: RawCurriculumData,
): RawCurriculumData {
  const localSubjects = mapById(local.subjects);
  const remoteSubjectIds = new Set(remote.subjects.map((subject) => subject.id));

  const subjects = remote.subjects.map((remoteSubject) => {
    const localSubject = localSubjects.get(remoteSubject.id);
    if (!localSubject) {
      return remoteSubject;
    }

    return mergeSubjectPreferLocal(remoteSubject, localSubject);
  });

  for (const localSubject of local.subjects) {
    if (!remoteSubjectIds.has(localSubject.id)) {
      subjects.push(localSubject);
    }
  }

  return { subjects };
}

function mergeSubjectPreferLocal(remote: RawSubject, local: RawSubject): RawSubject {
  const remoteUnitIds = new Set(remote.units.map((unit) => unit.id));

  const units = remote.units.map((remoteUnit) => {
    const localUnit = local.units.find((item) => item.id === remoteUnit.id);
    if (!localUnit) {
      return remoteUnit;
    }
    return mergeUnitPreferLocal(remoteUnit, localUnit);
  });

  for (const localUnit of local.units) {
    if (!remoteUnitIds.has(localUnit.id)) {
      units.push(localUnit);
    }
  }

  return {
    id: remote.id,
    name: local.name || remote.name,
    color: local.color || remote.color,
    scheduleDays:
      local.scheduleDays.length > 0 ? [...local.scheduleDays] : [...remote.scheduleDays],
    units,
  };
}

function mergeUnitPreferLocal(remote: RawUnit, local: RawUnit): RawUnit {
  const remoteLessonIds = new Set(remote.lessons.map((lesson) => lesson.id));

  const lessons = remote.lessons.map((remoteLesson) => {
    const localLesson = local.lessons.find((item) => item.id === remoteLesson.id);
    if (!localLesson) {
      return remoteLesson;
    }
    return {
      id: remoteLesson.id,
      title: localLesson.title || remoteLesson.title,
    };
  });

  for (const localLesson of local.lessons) {
    if (!remoteLessonIds.has(localLesson.id)) {
      lessons.push(localLesson);
    }
  }

  return {
    id: remote.id,
    name: local.name || remote.name,
    lessons,
  };
}

function subjectChanged(local: RawSubject, base: RawSubject): boolean {
  if (local.name !== base.name || local.color !== base.color) {
    return true;
  }
  if (!areNumberArraysEqual(local.scheduleDays, base.scheduleDays)) {
    return true;
  }
  if (local.units.length !== base.units.length) {
    return true;
  }

  const baseUnits = mapById(base.units);
  for (const unit of local.units) {
    const baseUnit = baseUnits.get(unit.id);
    if (!baseUnit || unitChanged(unit, baseUnit)) {
      return true;
    }
  }

  return false;
}

function unitChanged(local: RawUnit, base: RawUnit): boolean {
  if (local.name !== base.name || local.lessons.length !== base.lessons.length) {
    return true;
  }

  const baseLessons = mapById(base.lessons);
  for (const lesson of local.lessons) {
    const baseLesson = baseLessons.get(lesson.id);
    if (!baseLesson || lesson.title !== baseLesson.title) {
      return true;
    }
  }

  return false;
}

function pickLocalChange(
  localValue: string | undefined,
  baseValue: string | undefined,
  remoteValue: string,
): string {
  if (typeof localValue !== "string") {
    return remoteValue;
  }
  if (typeof baseValue !== "string") {
    return localValue;
  }
  return localValue !== baseValue ? localValue : remoteValue;
}

function pickLocalScheduleDays(
  localValue: number[] | undefined,
  baseValue: number[] | undefined,
  remoteValue: number[],
): number[] {
  if (!Array.isArray(localValue)) {
    return [...remoteValue];
  }
  if (!Array.isArray(baseValue)) {
    return [...localValue];
  }
  return areNumberArraysEqual(localValue, baseValue)
    ? [...remoteValue]
    : [...localValue];
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function areNumberArraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const left = [...a].sort((x, y) => x - y);
  const right = [...b].sort((x, y) => x - y);
  return left.every((value, index) => value === right[index]);
}

function rawFromSubjects(subjects: Subject[]): RawCurriculumData {
  return {
    subjects: subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      scheduleDays: normalizeScheduleDays(subject.scheduleDays),
      units: (subject.units || []).map((unit) => ({
        id: unit.id,
        name: unit.name,
        lessons: (unit.lessons || []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
        })),
      })),
    })),
  };
}

function normalizeRawCurriculumData(data: unknown): RawCurriculumData {
  const source = getSubjectsSource(data);
  return {
    subjects: source.map((value, index) => normalizeRawSubject(value, index)),
  };
}

function getSubjectsSource(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  const objectValue = asObject(data);
  if (!objectValue) {
    return [];
  }

  return Array.isArray(objectValue.subjects) ? objectValue.subjects : [];
}

function normalizeRawSubject(value: unknown, subjectIndex: number): RawSubject {
  const record = asObject(value) ?? {};
  const units = normalizeRawUnits(record);
  const scheduleDays = normalizeScheduleDays(record.scheduleDays);

  return {
    id: readString(record.id) || uid(),
    name: readString(record.name) || `Subject ${subjectIndex + 1}`,
    color:
      readString(record.color) || SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length],
    scheduleDays,
    units,
  };
}

function normalizeRawUnits(subject: Record<string, unknown>): RawUnit[] {
  const units = Array.isArray(subject.units) ? subject.units : [];
  if (units.length > 0) {
    return units.map((value, index) => normalizeRawUnit(value, index));
  }

  const lessons = Array.isArray(subject.lessons) ? subject.lessons : [];
  if (lessons.length === 0) {
    return [];
  }

  return [
    {
      id: uid(),
      name: "General",
      lessons: lessons.map((value, index) => normalizeRawLesson(value, index)),
    },
  ];
}

function normalizeRawUnit(value: unknown, unitIndex: number): RawUnit {
  const record = asObject(value) ?? {};
  const lessons = Array.isArray(record.lessons) ? record.lessons : [];

  return {
    id: readString(record.id) || uid(),
    name: readString(record.name) || `Unit ${unitIndex + 1}`,
    lessons: lessons.map((lesson, lessonIndex) =>
      normalizeRawLesson(lesson, lessonIndex),
    ),
  };
}

function normalizeRawLesson(value: unknown, lessonIndex: number): RawLesson {
  const record = asObject(value) ?? {};

  return {
    id: readString(record.id) || uid(),
    title: readString(record.title) || `Lesson ${lessonIndex + 1}`,
  };
}

async function readBaseSnapshot(): Promise<CurriculumBaseSnapshot | null> {
  const raw = await idbGet(CURRICULUM_BASE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = typeof raw === "string" ? safelyParseJson(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const value = parsed as Partial<CurriculumBaseSnapshot>;
  if (
    typeof value.curriculumId !== "string" ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    typeof value.updatedAt !== "string" ||
    !value.data
  ) {
    return null;
  }

  return {
    curriculumId: value.curriculumId,
    version: value.version,
    updatedAt: value.updatedAt,
    data: normalizeRawCurriculumData(value.data),
  };
}

async function writeBaseSnapshot(snapshot: CurriculumBaseSnapshot): Promise<void> {
  await idbSet(CURRICULUM_BASE_KEY, JSON.stringify(snapshot));
}

async function readStoredAppState(): Promise<AppState | null> {
  const raw = await idbGet("state");
  if (!raw) {
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      return null;
    }
  }

  return raw as AppState;
}

function createEmptyWeeklyData() {
  return Array.from({ length: 7 }, (_value, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      day: DAY_NAMES[date.getDay()],
      xp: 0,
      lessons: 0,
    };
  });
}

function normalizeScheduleDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result = new Set<number>();
  for (const day of value) {
    const parsed = Number(day);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) {
      result.add(parsed);
    }
  }

  return [...result].sort((a, b) => a - b);
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safelyParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function coerceAppState(value: unknown): AppState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<AppState>;
  if (!Array.isArray(record.subjects)) {
    return null;
  }

  return {
    ...INITIAL,
    ...record,
    ownerUserId:
      typeof record.ownerUserId === "string" ? record.ownerUserId : INITIAL.ownerUserId,
    subjects: record.subjects as Subject[],
    weeklyData:
      Array.isArray(record.weeklyData) && record.weeklyData.length === 7
        ? record.weeklyData
        : createEmptyWeeklyData(),
  };
}
