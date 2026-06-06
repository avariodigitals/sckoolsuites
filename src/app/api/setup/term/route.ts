import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { z } from "zod";

const createTermSchema = z.object({
  sessionId: z.string(),
  name: z.string().min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// POST - Create term during setup (no auth required)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTermSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, name, startDate, endDate } = parsed.data;

    // Check if session exists
    const session = await queryOne<{ id: string }>(
      'SELECT id FROM session WHERE id = $1',
      [sessionId]
    );
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check for duplicate term name in session
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM term WHERE session_id = $1 AND name = $2',
      [sessionId, name]
    );
    if (existing) {
      return NextResponse.json(
        { error: "Term with this name already exists in this session" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO term (session_id, name, start_date, end_date, is_current, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [sessionId, name, startDate || null, endDate || null, true, 'ACTIVE']
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Term creation error:", error);
    return NextResponse.json(
      { error: "Failed to create term" },
      { status: 500 }
    );
  }
}
