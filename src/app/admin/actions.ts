"use server";

import { requirePrivilege } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export async function assignSchoolToUser(_schoolId: string) {
  void _schoolId;
  const user = await requirePrivilege("settings.manage");
  
  // Single-school mode: user table has no school_id column.
  // This action is retained for API compatibility but does not mutate the DB.
  revalidatePath("/admin/dashboard");
  return { success: true, userId: user.id };
}
