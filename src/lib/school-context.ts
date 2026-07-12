import { auth } from "@/auth";

export type SessionLike = {
  user?: {
    id?: number | string;
    schoolId?: string | null;
    role?: string;
  } | null;
} | null;

export function getSchoolId(session: SessionLike): string {
  return session?.user?.schoolId ?? "default";
}

export async function resolveSchoolId(): Promise<string> {
  const session = await auth();
  return getSchoolId(session);
}
