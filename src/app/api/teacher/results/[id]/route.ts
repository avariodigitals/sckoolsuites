import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteFromCloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/audit-log";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = new Set([
    "SCHOOL_ADMIN",
    "HEAD_OF_SCHOOL",
    "PRINCIPAL",
    "SUPER_ADMIN",
  ]);
  if (!allowedRoles.has(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await params;
  const resultId = Number(idRaw);
  if (Number.isNaN(resultId)) {
    return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
  }

  const schoolId = session.user.schoolId || "default";

  try {
    const result = await prisma.result.findFirst({
      where: { id: resultId, schoolId },
    });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    if (result.fileUrl) {
      try {
        const url = new URL(result.fileUrl);
        const pathParts = url.pathname.split("/");
        const uploadIndex = pathParts.indexOf("upload");
        if (uploadIndex !== -1 && uploadIndex + 1 < pathParts.length) {
          const publicIdParts = pathParts.slice(uploadIndex + 2);
          const publicId = publicIdParts.join("/").replace(/\.[^.]+$/, "");
          if (publicId) {
            await deleteFromCloudinary(publicId);
          }
        }
      } catch {
        // Cloudinary deletion is best-effort
      }
    }

    await prisma.result.update({
      where: { id: resultId },
      data: {
        fileUrl: null,
        fileName: null,
        status: "DRAFT",
      },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "RESULT_FILE_DELETED",
      targetType: "Result",
      targetId: String(resultId),
      metadata: {
        studentId: result.studentId,
        previousFileName: result.fileName,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[result-delete]", error);
    return NextResponse.json({ error: "Failed to delete result file" }, { status: 500 });
  }
}
