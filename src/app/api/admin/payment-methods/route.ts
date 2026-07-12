import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { query } from "@/lib/db";

const schoolId = "default";

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "payments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [methodsRes, accountsRes] = await Promise.all([
    query(
      `SELECT id, name, code, is_active, sort_order FROM payment_method WHERE school_id = $1 ORDER BY sort_order`,
      [schoolId]
    ),
    query(
      `SELECT id, account_name, bank_name, account_number, branch, instructions, is_active, is_default FROM school_bank_account WHERE school_id = $1 ORDER BY is_default DESC, created_at`,
      [schoolId]
    ),
  ]);

  return NextResponse.json({
    methods: methodsRes.rows,
    accounts: accountsRes.rows,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "payments");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.type === "toggle_method") {
      const { code, is_active } = body;
      await query(
        `UPDATE payment_method SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE school_id = $2 AND code = $3`,
        [is_active, schoolId, code]
      );
      return NextResponse.json({ success: true });
    }

    if (body.type === "add_account") {
      const { account_name, bank_name, account_number, branch, instructions } = body;
      const result = await query(
        `INSERT INTO school_bank_account (school_id, account_name, bank_name, account_number, branch, instructions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
        [schoolId, account_name, bank_name, account_number || null, branch || null, instructions || null]
      );
      return NextResponse.json({ success: true, id: result.rows[0].id });
    }

    if (body.type === "update_account") {
      const { id, account_name, bank_name, account_number, branch, instructions, is_active } = body;
      await query(
        `UPDATE school_bank_account
         SET account_name = $1, bank_name = $2, account_number = $3, branch = $4, instructions = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND school_id = $8`,
        [account_name, bank_name, account_number || null, branch || null, instructions || null, is_active, id, schoolId]
      );
      return NextResponse.json({ success: true });
    }

    if (body.type === "delete_account") {
      const { id } = body;
      await query(
        `DELETE FROM school_bank_account WHERE id = $1 AND school_id = $2`,
        [id, schoolId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
  } catch (err: any) {
    console.error("[payment-methods] error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
