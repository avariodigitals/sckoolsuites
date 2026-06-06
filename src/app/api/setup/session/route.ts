import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const createSessionSchema = z.object({
  name: z.string().min(3),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// POST - Create session during setup (no auth required)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSessionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, startDate, endDate } = parsed.data;

    // Check if school exists
    const school = await queryOne<{ id: string }>('SELECT id FROM school WHERE id = $1', ['default']);
    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check for duplicate session name
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM session WHERE name = $1',
      [name]
    );
    if (existing) {
      return NextResponse.json(
        { error: "Session with this name already exists" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO session (name, start_date, end_date, is_current, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, startDate || null, endDate || null, true, 'ACTIVE']
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
