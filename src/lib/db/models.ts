import mongoose, { Model, Schema } from "mongoose";

export interface AdminDocument {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: string;
  updatedAt: string;
}

export interface UserDocument {
  id: string;
  username: string;
  phone: string;
  passwordHash: string;
  selectedCurriculumId: string | null;
  role: "user";
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumVersionDocument {
  id: string;
  curriculumId: string;
  version: number;
  title: string;
  data: unknown;
  createdBy: string;
  createdAt: string;
}

export interface CurriculumDocument {
  id: string;
  title: string;
  status: "draft" | "published";
  activeVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versions: CurriculumVersionDocument[];
}

export type BackupFrequencyDocument = "daily" | "weekly" | "monthly";

export interface BackupItemDocument {
  id: string;
  createdAt: string;
  bytes: number;
  compression: "none" | "gzip";
  stateHash: string;
  fileName: string;
  state: unknown;
}

export interface BackupDocument {
  userId: string;
  frequency: BackupFrequencyDocument;
  updatedAt: string;
  items: BackupItemDocument[];
}

const adminSchema = new Schema<AdminDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "admins",
    versionKey: false,
  },
);

const userSchema = new Schema<UserDocument>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    selectedCurriculumId: { type: String, default: null },
    role: { type: String, enum: ["user"], required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    collection: "users",
    versionKey: false,
  },
);

const curriculumVersionSchema = new Schema<CurriculumVersionDocument>(
  {
    id: { type: String, required: true },
    curriculumId: { type: String, required: true },
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    data: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true },
  },
  {
    _id: false,
  },
);

const curriculumSchema = new Schema<CurriculumDocument>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "published"], required: true },
    activeVersion: { type: Number, required: true, min: 1 },
    createdBy: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
    versions: { type: [curriculumVersionSchema], default: [] },
  },
  {
    collection: "curricula",
    versionKey: false,
  },
);

const backupItemSchema = new Schema<BackupItemDocument>(
  {
    id: { type: String, required: true },
    createdAt: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    compression: { type: String, enum: ["none", "gzip"], required: true },
    stateHash: { type: String, required: true },
    fileName: { type: String, required: true },
    state: { type: Schema.Types.Mixed, required: true },
  },
  {
    _id: false,
  },
);

const backupSchema = new Schema<BackupDocument>(
  {
    userId: { type: String, required: true, unique: true },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
      default: "weekly",
    },
    updatedAt: { type: String, required: true },
    items: { type: [backupItemSchema], default: [] },
  },
  {
    collection: "backups",
    versionKey: false,
  },
);

function getModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema);
}

export const AdminModel = getModel<AdminDocument>("Admin", adminSchema);
export const UserModel = getModel<UserDocument>("User", userSchema);
export const CurriculumModel = getModel<CurriculumDocument>("Curriculum", curriculumSchema);
export const BackupModel = getModel<BackupDocument>("Backup", backupSchema);
