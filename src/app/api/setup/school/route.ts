import { NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";

// POST - Create school during setup (no auth required)
export async function POST(request: Request) {
  try {
    // Check if school already exists
    const existing = await queryOne<{ id: string }>('SELECT id FROM school WHERE id = $1', ['default']);
    if (existing) {
      return NextResponse.json(
        { error: "School already exists" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim() || null;
    const motto = String(formData.get("motto") ?? "").trim() || null;

    // Validation
    if (!name || !email || !phone || !address) {
      return NextResponse.json(
        { error: "Name, email, phone, and address are required" },
        { status: 400 }
      );
    }

    // Create school and branding in transaction
    const school = await withTransaction(async (client) => {
      // Create school
      const schoolResult = await client.query(
        `INSERT INTO school (id, name, email, phone, address, website, motto, is_active, is_setup)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        ['default', name, email, phone, address, website, motto, false, false]
      );

      // Create default branding
      await client.query(
        `INSERT INTO school_branding (school_id, primary_color, secondary_color, report_card_theme, invoice_theme, receipt_theme)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['default', '#0B1F4D', '#0E9F6E', 'classic', 'clean', 'simple']
      );

      return schoolResult.rows[0];
    });

    return NextResponse.json({ 
      success: true, 
      school,
      message: "School created successfully" 
    });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}
