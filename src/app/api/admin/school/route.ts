import { NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// POST - Create new school (requires settings.manage)
export async function POST(request: Request) {
  try {
    const user = await requirePrivilege("settings.manage");
    void user;
    
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

    // Create school
    const school = await prisma.school.create({
      data: {
        name,
        email,
        phone,
        address,
        website,
        motto,
        isActive: true,
      },
    });

    // Create branding row separately (shim does not support nested create)
    await prisma.schoolBranding.create({
      data: { schoolId: school.id },
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/settings/school");

    return NextResponse.json({ 
      success: true, 
      school,
      message: "School created successfully. You have been assigned to this school." 
    });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}

// PUT - Update existing school
export async function PUT(request: Request) {
  try {
    const user = await requirePrivilege("settings.manage");
    void user;
    
    const formData = await request.formData();
    
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim() || null;
    const motto = String(formData.get("motto") ?? "").trim() || null;

    // Get user's school
    const schoolId = user.schoolId || "default";
    if (!schoolId) {
      return NextResponse.json(
        { error: "No school assigned to user" },
        { status: 400 }
      );
    }

    // Validation
    if (!name || !email || !phone || !address) {
      return NextResponse.json(
        { error: "Name, email, phone, and address are required" },
        { status: 400 }
      );
    }

    // Update school
    const school = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name,
        email,
        phone,
        address,
        website,
        motto,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/school");

    return NextResponse.json({ 
      success: true, 
      school,
      message: "School updated successfully" 
    });
  } catch (error) {
    console.error("Error updating school:", error);
    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}
