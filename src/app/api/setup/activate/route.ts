import { NextResponse } from "next/server";
import { queryOne, withTransaction } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const activateSchema = z.object({
  sessionId: z.coerce.string(),
  termId: z.coerce.string(),
  adminUser: z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

// POST - Activate school and create admin user
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = activateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, termId, adminUser } = parsed.data;

    // Check if admin already exists
    const existingAdmin = await queryOne<{ id: string }>(
      'SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)',
      [adminUser.email]
    );
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin user already exists with this email" },
        { status: 400 }
      );
    }

    // Get SCHOOL_ADMIN role
    const adminRole = await queryOne<{ id: number }>(
      "SELECT id FROM role WHERE name = 'SCHOOL_ADMIN'"
    );
    if (!adminRole) {
      return NextResponse.json(
        { error: "SCHOOL_ADMIN role not found" },
        { status: 500 }
      );
    }

    // Create admin user and activate school in transaction
    const result = await withTransaction(async (client) => {
      // Create admin user
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      const userResult = await client.query(
        `INSERT INTO "user" (name, email, password, role_id, is_active)
         VALUES ($1, LOWER($2), $3, $4, $5)
         RETURNING id, name, email`,
        [adminUser.name, adminUser.email, hashedPassword, adminRole.id, true]
      );
      const user = userResult.rows[0];

      // Activate school
      await client.query(
        'UPDATE school SET is_active = $1, is_setup = $2 WHERE id = $3',
        [true, true, 'default']
      );

      // Set active session and term settings
      await client.query(
        'INSERT INTO school_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        ['active_session_id', sessionId]
      );
      await client.query(
        'INSERT INTO school_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        ['active_term_id', termId]
      );
      await client.query(
        'INSERT INTO school_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [`user_context_session_${user.id}`, sessionId]
      );
      await client.query(
        'INSERT INTO school_setting (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [`user_context_term_${user.id}`, termId]
      );

      return user;
    });

    return NextResponse.json({
      success: true,
      message: "School activated successfully",
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
      },
    });
  } catch (error) {
    console.error("Activation error:", error);
    return NextResponse.json(
      { error: "Failed to activate school" },
      { status: 500 }
    );
  }
}
