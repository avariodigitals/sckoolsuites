import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role
    ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "TEACHER", "REGISTRAR"].includes(role)
    : false;
}

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/tiff",
  "image/heic",
  "image/heif",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const documents = await prisma.studentDocument.findMany({
    where: { studentId: parsedId, schoolId: "default" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const student = await prisma.student.findFirst({
    where: { id: parsedId, schoolId },
    select: { id: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title") as string | null;
    const documentType = formData.get("documentType") as string | null;
    const description = formData.get("description") as string | null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, DOC, DOCX, PNG, JPG, WEBP, TIFF files are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 10MB or less" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadToCloudinary(buffer, file.type, {
      schoolId,
      folder: "student_documents",
      publicId: `student_${id}_doc_${Date.now()}`,
      overwrite: false,
    });

    const doc = await prisma.studentDocument.create({
      data: {
        schoolId,
        studentId: parsedId,
        title: title?.trim() || file.name,
        documentType: documentType || "OTHER",
        fileUrl: result.url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        description: description?.trim() || null,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "students");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId is required" }, { status: 400 });

  let docIdNum: number;
  try {
    docIdNum = parseNumericId(docId, "document id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid document id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await prisma.studentDocument.delete({
      where: { id: docIdNum, studentId: parsedId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
