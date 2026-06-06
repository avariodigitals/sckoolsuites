import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    // Check if already set up
    const existingSchool = await prisma.school.findFirst();
    if (existingSchool) {
      return NextResponse.json({ 
        success: true, 
        message: "Already set up",
        school: existingSchool 
      });
    }

    // 1. Create School
    const school = await prisma.school.create({
      data: {
        name: "Demo School",
        email: "school@demo.com",
        phone: "+234 800 000 0000",
        address: "123 School Street, Lagos, Nigeria",
        website: "www.demoschool.edu",
        motto: "Excellence in Education",
        isActive: true,
        branding: {
          create: {}
        }
      }
    });

    // 2. Create Role if not exists
    const adminRole = await prisma.role.upsert({
      where: { name: "SCHOOL_ADMIN" },
      update: {},
      create: { name: "SCHOOL_ADMIN" }
    });

    // 3. Create Default Admin User (linked to school)
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        name: "School Admin",
        email: "admin@demo.com",
        password: hashedPassword,
        roleId: adminRole.id,
        schoolId: school.id,
      }
    });

    // 4. Create Session
    const session = await prisma.session.create({
      data: {
        schoolId: school.id,
        name: "2025/2026",
        isCurrent: true,
        status: "ACTIVE",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2026-07-31"),
      }
    });

    // 5. Create Term
    const term = await prisma.term.create({
      data: {
        schoolId: school.id,
        sessionId: session.id,
        name: "First Term",
        isCurrent: true,
        status: "ACTIVE",
        startDate: new Date("2025-09-01"),
        endDate: new Date("2025-12-20"),
      }
    });

    // 6. Set active settings
    await prisma.schoolSetting.create({
      data: {
        schoolId: school.id,
        key: "active_session_id",
        value: session.id
      }
    });
    await prisma.schoolSetting.create({
      data: {
        schoolId: school.id,
        key: "active_term_id",
        value: term.id
      }
    });
    await prisma.schoolSetting.create({
      data: {
        schoolId: school.id,
        key: `user_context_session_${admin.id}`,
        value: session.id
      }
    });
    await prisma.schoolSetting.create({
      data: {
        schoolId: school.id,
        key: `user_context_term_${admin.id}`,
        value: term.id
      }
    });

    return NextResponse.json({
      success: true,
      message: "Auto-setup complete!",
      credentials: {
        email: "admin@demo.com",
        password: "admin123"
      },
      school: { id: school.id, name: school.name },
      session: { id: session.id, name: session.name },
      term: { id: term.id, name: term.name }
    });

  } catch (error) {
    console.error("Auto-setup error:", error);
    return NextResponse.json(
      { error: "Setup failed", details: String(error) },
      { status: 500 }
    );
  }
}
