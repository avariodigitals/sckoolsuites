import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { query } from "@/lib/db";

const schoolId = "default";

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "terms");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const terms = await query(
      `SELECT id, name, session_id, is_current, status, start_date, end_date
       FROM term WHERE school_id = $1 ORDER BY name`,
      [schoolId]
    );

    return NextResponse.json({ terms: terms.rows });
  } catch (err: any) {
    console.error("[terms api] error:", err);
    return NextResponse.json({ error: err.message || "Failed to load terms" }, { status: 500 });
  }
}
