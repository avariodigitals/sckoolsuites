import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { parseNumericId } from "@/lib/id-helpers";

const schoolId = "default";

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "templates");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await query(
    `SELECT id, name, type, class_group_name, term_name, file_url, file_type, field_config, eligible_class_groups, is_active, created_at
     FROM school_template WHERE school_id = $1 ORDER BY type, name`,
    [schoolId]
  );

  return NextResponse.json({ templates: templates.rows });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "templates");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = String(formData.get("name") || "").trim();
    const type = String(formData.get("type") || "").toUpperCase();
    const classGroupName = String(formData.get("classGroupName") || "").trim() || null;
    const termName = String(formData.get("termName") || "").trim() || null;
    const fieldConfig = String(formData.get("fieldConfig") || "").trim() || null;
    const eligibleClassGroups = String(formData.get("eligibleClassGroups") || "").trim() || null;

    if (!file || !name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const VALID_TYPES = ["REPORT_CARD", "INVOICE", "RECEIPT", "ID_CARD", "CERTIFICATE", "TRANSCRIPT", "AWARD", "TESTIMONIAL"];
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    let fileType: string;
    if (ext === "pdf") fileType = "pdf";
    else if (["xlsx", "xls", "csv"].includes(ext || "")) fileType = "excel";
    else if (["doc", "docx"].includes(ext || "")) fileType = "word";
    else {
      return NextResponse.json({ error: "Only PDF, Excel, or Word files allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").substring(0, 30);
    const result = await uploadToCloudinary(buffer, file.type, {
      schoolId,
      folder: "templates",
      publicId: `template_${type.toLowerCase()}_${safeName}`,
      overwrite: false,
    });

    // Insert new template (no unique constraint — multiple per type allowed)
    await query(
      `INSERT INTO school_template (school_id, name, type, class_group_name, term_name, file_url, file_type, field_config, eligible_class_groups, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
      [schoolId, name, type, classGroupName, termName, result.url, fileType, fieldConfig, eligibleClassGroups]
    );

    return NextResponse.json({ success: true, url: result.url });
  } catch (err: any) {
    console.error("[template upload] error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "templates");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Template ID required" }, { status: 400 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "template id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid template id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await query(`DELETE FROM school_template WHERE id = $1 AND school_id = $2`, [parsedId, schoolId]);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "templates");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Template ID required" }, { status: 400 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "template id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid template id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (body.fieldConfig !== undefined) {
      updates.push(`field_config = $${paramIdx++}`);
      values.push(body.fieldConfig || null);
    }
    if (body.eligibleClassGroups !== undefined) {
      updates.push(`eligible_class_groups = $${paramIdx++}`);
      values.push(body.eligibleClassGroups || null);
    }
    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      values.push(body.isActive);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      values.push(body.name);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(parsedId, schoolId);
    await query(
      `UPDATE school_template SET ${updates.join(", ")} WHERE id = $${paramIdx++} AND school_id = $${paramIdx++}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
