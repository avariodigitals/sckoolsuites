import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const surveys = await prisma.survey.findMany({
      where: { schoolId },
      include: {
        questions: { orderBy: { order: "asc" } },
        responses: { select: { id: true, userId: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      surveys: surveys.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        questionCount: s.questions.length,
        responseCount: s.responses.length,
        hasResponded: s.responses.some((r) => r.userId === session.user!.id),
        createdAt: s.createdAt.toISOString(),
        questions: s.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          options: q.options ? JSON.parse(q.options) : null,
          order: q.order,
          required: q.required,
        })),
      })),
    });
  } catch (err) {
    console.error("[surveys GET]", err);
    return NextResponse.json({ surveys: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const { title, description, questions, status } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (!questions?.length) {
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
    }

    const survey = await prisma.survey.create({
      data: {
        schoolId,
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "DRAFT",
        createdBy: session.user.id,
        questions: {
          create: questions.map((q: any, i: number) => ({
            text: q.text?.trim() || "",
            type: q.type || "text",
            options: q.options ? JSON.stringify(q.options) : null,
            order: i,
            required: q.required ?? true,
          })),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ ok: true, survey });
  } catch (err) {
    console.error("[surveys POST]", err);
    return NextResponse.json({ error: "Failed to create survey" }, { status: 500 });
  }
}
