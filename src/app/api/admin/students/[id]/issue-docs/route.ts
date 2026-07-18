import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { parseNumericId } from "@/lib/id-helpers";

const SCHOOL_ID = "default";

const ISSUE_ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "TEACHER"];

function isAuthorized(role?: string) {
  return role ? ISSUE_ROLES.includes(role) : false;
}

const DOC_TYPES = ["ID_CARD", "CERTIFICATE", "TRANSCRIPT", "AWARD", "TESTIMONIAL"];

// GET: fetch available templates + already issued docs for this student
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "students");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let numericId: number;
  try {
    numericId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Get student's class group name for eligibility filtering
  const studentRow = await query(
    `SELECT s.id, s.class_id, c.name as class_name, c.group_name
     FROM student s
     LEFT JOIN class_group c ON s.class_id = c.id
     WHERE s.id = $1`,
    [numericId]
  );

  if (studentRow.rows.length === 0) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const student = studentRow.rows[0];
  const studentClassName = student.class_name || "";
  const studentGroupName = student.group_name || "";

  // Fetch templates for document types
  const templatesResult = await query(
    `SELECT id, name, type, class_group_name, term_name, file_url, file_type, field_config, eligible_class_groups
     FROM school_template
     WHERE school_id = $1 AND is_active = true AND type = ANY($2::text[])
     ORDER BY type, name`,
    [SCHOOL_ID, DOC_TYPES]
  );

  // Filter templates by eligibility
  const templates = templatesResult.rows.filter((tmpl: any) => {
    if (!tmpl.eligible_class_groups) return true; // no restriction = all eligible
    try {
      const eligible: string[] = JSON.parse(tmpl.eligible_class_groups);
      if (eligible.length === 0) return true;
      return eligible.includes(studentGroupName) || eligible.includes(studentClassName);
    } catch {
      return true;
    }
  });

  // Fetch already issued documents for this student (template-based)
  const issuedResult = await query(
    `SELECT sd.id, sd.title, sd.document_type, sd.file_url, sd.template_id, sd.field_data,
            sd.status, sd.parent_viewable, sd.parent_downloadable, sd.created_at, sd.updated_at,
            st.name as template_name, st.type as template_type, st.file_url as template_file_url
     FROM student_document sd
     LEFT JOIN school_template st ON sd.template_id = st.id
     WHERE sd.student_id = $1 AND sd.template_id IS NOT NULL
     ORDER BY sd.created_at DESC`,
    [numericId]
  );

  return NextResponse.json({
    templates,
    issuedDocs: issuedResult.rows,
    student: { id: numericId, className: studentClassName, groupName: studentGroupName },
  });
}

// POST: create a new issued document (draft or finalized)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let numericId: number;
  try {
    numericId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { templateId, documentType, title, fieldData, status, parentViewable, parentDownloadable } = body;

    if (!templateId || !documentType || !title) {
      return NextResponse.json({ error: "Missing required fields: templateId, documentType, title" }, { status: 400 });
    }

    if (!DOC_TYPES.includes(documentType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // Verify template exists and is active
    const tmplResult = await query(
      `SELECT id, file_url, file_type FROM school_template WHERE id = $1 AND school_id = $2 AND is_active = true`,
      [templateId, SCHOOL_ID]
    );
    if (tmplResult.rows.length === 0) {
      return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
    }

    const tmpl = tmplResult.rows[0];
    const fieldDataStr = fieldData ? JSON.stringify(fieldData) : null;
    const docStatus = status || "DRAFT";

    const result = await query(
      `INSERT INTO student_document (school_id, student_id, title, document_type, file_url, file_name, mime_type, template_id, field_data, status, parent_viewable, parent_downloadable, uploaded_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        SCHOOL_ID,
        numericId,
        title,
        documentType,
        tmpl.file_url, // use template file URL as base; will be updated when finalized
        `${title}.pdf`,
        "application/pdf",
        templateId,
        fieldDataStr,
        docStatus,
        parentViewable ?? false,
        parentDownloadable ?? false,
        session.user.id,
      ]
    );

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create issued document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: update an issued document (edit field data, finalize, toggle parent access)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "students");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let numericId: number;
  try {
    numericId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { docId, fieldData, status, parentViewable, parentDownloadable, title, fileUrl } = body;

    if (!docId) {
      return NextResponse.json({ error: "Document ID (docId) required" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (fieldData !== undefined) {
      updates.push(`field_data = $${paramIdx++}`);
      values.push(fieldData ? JSON.stringify(fieldData) : null);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIdx++}`);
      values.push(status);
    }
    if (parentViewable !== undefined) {
      updates.push(`parent_viewable = $${paramIdx++}`);
      values.push(parentViewable);
    }
    if (parentDownloadable !== undefined) {
      updates.push(`parent_downloadable = $${paramIdx++}`);
      values.push(parentDownloadable);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIdx++}`);
      values.push(title);
    }
    if (fileUrl !== undefined) {
      updates.push(`file_url = $${paramIdx++}`);
      values.push(fileUrl);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(docId, numericId);
    await query(
      `UPDATE student_document SET ${updates.join(", ")} WHERE id = $${paramIdx++} AND student_id = $${paramIdx++}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: remove an issued document
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "students");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let numericId: number;
  try {
    numericId = parseNumericId(id, "student id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid student ID";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId) {
    return NextResponse.json({ error: "Document ID (docId) required" }, { status: 400 });
  }

  let parsedDocId: number;
  try {
    parsedDocId = parseNumericId(docId, "document id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid document id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await query(
    `DELETE FROM student_document WHERE id = $1 AND student_id = $2 AND template_id IS NOT NULL`,
    [parsedDocId, numericId]
  );

  return NextResponse.json({ success: true });
}
