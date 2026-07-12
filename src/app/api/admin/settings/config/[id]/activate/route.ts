import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { activateSchoolConfigVersion } from "@/lib/school-config";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const updated = await activateSchoolConfigVersion("default", id);
    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      isActive: updated.isActive,
      source: updated.source,
      notes: updated.notes,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to activate configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
