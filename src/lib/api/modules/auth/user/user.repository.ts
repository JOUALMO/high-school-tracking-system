import { HttpError } from "@/lib/api/http-error";
import { UserRecord } from "../shared/auth.types";
import { UserModel } from "@/lib/db/models";

export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const user = await UserModel.findOne({ phone: phone.trim() }, { _id: 0 })
    .lean<UserRecord>()
    .exec();

  if (!user) {
    return null;
  }

  return user;
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const user = await UserModel.findOne({ id: userId }, { _id: 0 })
    .lean<UserRecord>()
    .exec();
  return user ?? null;
}

export async function createUser(record: UserRecord): Promise<void> {
  try {
    await UserModel.create({
      ...record,
      phone: record.phone.trim(),
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      throw new HttpError(409, "Phone number already exists.");
    }

    throw error;
  }
}

export async function listUsers(): Promise<UserRecord[]> {
  const users = await UserModel.find({}, { _id: 0 })
    .sort({ createdAt: -1 })
    .lean<UserRecord[]>()
    .exec();
  return users;
}
