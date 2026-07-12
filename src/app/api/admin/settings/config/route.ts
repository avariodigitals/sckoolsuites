import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { getActiveSchoolConfig, getSchoolConfigVersions, publishSchoolConfigVersion } from "@/lib/school-config";

const publishConfigSchema = z.object({
  config: z.unknown(),
  notes: z.string().optional(),
  source: z.string().optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [active, versions] = await Promise.all([
    getActiveSchoolConfig("default"),
    getSchoolConfigVersions("default"),
  ]);

  return NextResponse.json({ active, versions });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "settings");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = publishConfigSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await publishSchoolConfigVersion({
      schoolId: "default",
      config: parsed.data.config,
      notes: parsed.data.notes,
      source: parsed.data.source ?? "manual",
      createdById: session.user.id,
    });

    return NextResponse.json({
      id: created.id,
      version: created.version,
      isActive: created.isActive,
      source: created.source,
      notes: created.notes,
      createdAt: created.createdAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to publish configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
