import { HttpError } from "@/lib/api/http-error";
import { AdminRecord } from "../shared/auth.types";
import { AdminModel } from "@/lib/db/models";

export async function findAdminByEmail(email: string): Promise<AdminRecord | null> {
  const admin = await AdminModel.findOne(
    { email: email.toLowerCase().trim() },
    { _id: 0 },
  )
    .lean<AdminRecord>()
    .exec();

  if (!admin) {
    return null;
  }

  return admin;
}

export async function createAdmin(record: AdminRecord): Promise<void> {
  try {
    await AdminModel.create({
      ...record,
      email: record.email.toLowerCase().trim(),
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000
    ) {
      throw new HttpError(409, "Admin email already exists.");
    }

    throw error;
  }
}
