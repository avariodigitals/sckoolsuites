import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/audit-log";
import { extractCommentsFromPdf } from "@/lib/pdf-comment-extractor";
import { AcademicCalendarService } from "@/modules/academic-setup/services/academic-calendar.service";

const ALLOWED_TYPES = new Set(["application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const calendarService = new AcademicCalendarService();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set(["TEACHER", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const studentIdRaw = String(formData.get("studentId") ?? "").trim();
    const sessionIdRaw = String(formData.get("sessionId") ?? "").trim();
    const termIdRaw = String(formData.get("termId") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 10MB or less" }, { status: 400 });
    }

    const studentId = Number(studentIdRaw);
    const sessionId = Number(sessionIdRaw);
    const termId = Number(termIdRaw);

    if (Number.isNaN(studentId) || Number.isNaN(sessionId) || Number.isNaN(termId)) {
      return NextResponse.json({ error: "Invalid student, session, or term ID" }, { status: 400 });
    }

    const context = await calendarService.getUserContext(schoolId, session.user.id);
    const effectiveSessionId = sessionIdRaw ? sessionId : context.sessionId;
    const effectiveTermId = termIdRaw ? termId : context.termId;

    if (!effectiveSessionId || !effectiveTermId) {
      return NextResponse.json({ error: "Academic context is not selected" }, { status: 400 });
    }

    const isAdmin = ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role);
    const teacher = isAdmin
      ? null
      : await prisma.teacher.findFirst({ where: { schoolId, userId: session.user.id } });

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { class: true, classArm: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!isAdmin) {
      if (!teacher) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
      }

      const assignedToClass = student.class?.teacherId === teacher.id;
      const assignedToArm = student.classArm?.teacherId === teacher.id;
      if (!assignedToClass && !assignedToArm) {
        return NextResponse.json(
          { error: "You can only upload reports for students in your assigned class or arm" },
          { status: 403 }
        );
      }

      // Lock: teachers cannot overwrite result PDFs that already exist.
      // They must request correction from their head (HEAD_TEACHER/HOD/ADMIN).
      const existingResult = await prisma.result.findFirst({
        where: {
          schoolId,
          studentId,
          termId: effectiveTermId,
          sessionId: effectiveSessionId,
        },
        select: { id: true, fileUrl: true },
      });
      if (existingResult?.fileUrl) {
        return NextResponse.json(
          { error: "A report has already been uploaded for this student in this term. To replace it, please request a correction from your head teacher or admin." },
          { status: 403 }
        );
      }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract teacher/principal comments from the PDF text
    const extractedComments = await extractCommentsFromPdf(buffer);

    const uploadResult = await uploadToCloudinary(buffer, file.type, {
      schoolId,
      folder: `result-uploads/session_${effectiveSessionId}/term_${effectiveTermId}`,
      overwrite: false,
    });

    const result = await prisma.result.upsert({
      where: {
        studentId_termId_sessionId: {
          studentId,
          termId: effectiveTermId,
          sessionId: effectiveSessionId,
        },
      },
      update: {
        fileUrl: uploadResult.url,
        fileName: file.name,
        uploadedById: session.user.id,
        status: "DRAFT",
        reviewNote: null,
        approvedById: null,
        approvedAt: null,
        publishedById: null,
        publishedAt: null,
        ...(extractedComments.classTeacherComment
          ? { classTeacherComment: extractedComments.classTeacherComment }
          : {}),
        ...(extractedComments.principalComment
          ? { principalComment: extractedComments.principalComment }
          : {}),
      },
      create: {
        schoolId,
        studentId,
        termId: effectiveTermId,
        sessionId: effectiveSessionId,
        fileUrl: uploadResult.url,
        fileName: file.name,
        uploadedById: session.user.id,
        status: "DRAFT",
        ...(extractedComments.classTeacherComment
          ? { classTeacherComment: extractedComments.classTeacherComment }
          : {}),
        ...(extractedComments.principalComment
          ? { principalComment: extractedComments.principalComment }
          : {}),
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "RESULT_UPLOADED",
      targetType: "Result",
      targetId: String(result.id),
      metadata: {
        studentId,
        sessionId: effectiveSessionId,
        termId: effectiveTermId,
        fileName: file.name,
        fileUrl: uploadResult.url,
      },
    });

    return NextResponse.json({
      ok: true,
      result: {
        id: result.id,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        status: result.status,
      },
    });
  } catch (error) {
    console.error("[result-upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
