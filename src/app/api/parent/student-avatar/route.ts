import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const studentIdRaw = String(formData.get("studentId") ?? "").trim();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPG, WEBP images are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File must be 5MB or less" }, { status: 400 });
    }

    const studentId = Number(studentIdRaw);
    if (Number.isNaN(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, parentId: parent.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found or not linked to this parent" }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await uploadToCloudinary(buffer, file.type, {
      schoolId: student.schoolId,
      folder: "passports",
      publicId: `student_${studentId}`,
      overwrite: true,
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { passportUrl: result.url },
    });

    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
