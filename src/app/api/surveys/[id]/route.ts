import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const surveyId = Number(idRaw);
  if (Number.isNaN(surveyId)) {
    return NextResponse.json({ error: "Invalid survey ID" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const { status, title, description } = await req.json();

    const survey = await prisma.survey.findFirst({ where: { id: surveyId, schoolId } });
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;

    await prisma.survey.update({ where: { id: surveyId }, data });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[survey PATCH]", err);
    return NextResponse.json({ error: "Failed to update survey" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const surveyId = Number(idRaw);
  if (Number.isNaN(surveyId)) {
    return NextResponse.json({ error: "Invalid survey ID" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const survey = await prisma.survey.findFirst({ where: { id: surveyId, schoolId } });
    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    await prisma.survey.delete({ where: { id: surveyId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[survey DELETE]", err);
    return NextResponse.json({ error: "Failed to delete survey" }, { status: 500 });
  }
}
