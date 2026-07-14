import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const surveyId = Number(idRaw);
  if (Number.isNaN(surveyId)) {
    return NextResponse.json({ error: "Invalid survey ID" }, { status: 400 });
  }

  try {
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, status: "PUBLISHED" },
      include: { questions: true },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found or not published" }, { status: 404 });
    }

    const existing = await prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId: session.user.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "You have already responded to this survey" }, { status: 400 });
    }

    const { answers } = await req.json();
    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 });
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        userId: session.user.id,
        answers: {
          create: survey.questions.map((q) => {
            const ans = answers[q.id];
            if (q.type === "rating") {
              return { questionId: q.id, answerValue: String(ans ?? "") };
            }
            return { questionId: q.id, answerText: String(ans ?? "") };
          }),
        },
      },
    });

    return NextResponse.json({ ok: true, responseId: response.id });
  } catch (err) {
    console.error("[survey response POST]", err);
    return NextResponse.json({ error: "Failed to submit survey" }, { status: 500 });
  }
}
