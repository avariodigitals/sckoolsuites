import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, query } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get("childId");

  const parent = await prisma.parent.findFirst({
    where: { schoolId, userId: session.user.id },
    include: { user: true },
  });

  if (!parent) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  // Get all children linked to this parent
  const children = await prisma.student.findMany({
    where: { parentId: parent.id, schoolId },
    select: { id: true },
  });

  const childIds = children.map((c) => c.id);

  // If childId is specified, validate it belongs to this parent
  if (childId) {
    const numericChildId = parseInt(childId, 10);
    if (!childIds.includes(numericChildId)) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }
  }

  const targetIds = childId ? [parseInt(childId, 10)] : childIds;

  if (targetIds.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  // Fetch issued documents that are parent-viewable using raw SQL
  const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(", ");
  const documents = await query(
    `SELECT sd.id, sd.title, sd.document_type, sd.file_url, sd.status, sd.parent_downloadable,
            sd.student_id, sd.created_at,
            st.name as template_name, st.type as template_type, st.file_url as template_file_url,
            s.first_name, s.last_name, u.name as user_name
     FROM student_document sd
     LEFT JOIN school_template st ON sd.template_id = st.id
     LEFT JOIN student s ON sd.student_id = s.id
     LEFT JOIN "user" u ON s.user_id = u.id
     WHERE sd.student_id IN (${placeholders})
       AND sd.template_id IS NOT NULL
       AND sd.parent_viewable = true
     ORDER BY sd.created_at DESC`,
    targetIds
  );

  const docTypeLabels: Record<string, string> = {
    ID_CARD: "ID Card",
    CERTIFICATE: "Certificate",
    TRANSCRIPT: "Transcript",
    AWARD: "Award",
    TESTIMONIAL: "Testimonial",
  };

  const formatted = documents.rows.map((doc: any) => {
    const studentName = [doc.first_name, doc.last_name].filter(Boolean).join(" ") || doc.user_name || "";
    return {
      id: doc.id,
      title: doc.title,
      documentType: doc.document_type,
      typeLabel: docTypeLabels[doc.document_type] || doc.document_type,
      status: doc.status,
      parentDownloadable: doc.parent_downloadable,
      fileUrl: doc.template_file_url || doc.file_url,
      templateName: doc.template_name,
      studentName,
      studentId: doc.student_id,
      createdAt: doc.created_at,
    };
  });

  return NextResponse.json({ documents: formatted });
}
