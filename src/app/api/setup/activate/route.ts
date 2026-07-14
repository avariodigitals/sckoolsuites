import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedRoles, seedPrivileges, seedRolePrivileges } from "@/lib/privileges";
import bcrypt from "bcryptjs";
import { z } from "zod";

const activateSchema = z.object({
  school: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
    website: z.string().nullable(),
    motto: z.string().nullable(),
  }),
  session: z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
  }),
  term: z.object({
    name: z.string().min(1),
    startDate: z.string(),
    endDate: z.string(),
  }),
  adminUser: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

const SCHOOL_ID = "default";

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// POST - Atomic setup: create school, session, term, admin user, and settings in one transaction.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = activateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid setup data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { school, session, term, adminUser } = parsed.data;

    // Pre-flight checks outside the transaction are okay; the transaction itself
    // also guards against duplicates via unique constraints.

    // 1. Installation must not already be complete.
    const existingSchool = await prisma.school.findUnique({
      where: { id: SCHOOL_ID },
    });
    if (existingSchool?.isSetup) {
      return NextResponse.json(
        { error: "This installation is already active." },
        { status: 409 }
      );
    }

    // 2. Required SUPER_ADMIN role must exist. If missing, auto-seed system data.
    // The first user created during setup is the super admin with full access.
    let adminRole = await prisma.role.findUnique({
      where: { name: "SUPER_ADMIN" },
    });
    if (!adminRole) {
      await seedRoles();
      await seedPrivileges();
      await seedRolePrivileges();
      adminRole = await prisma.role.findUnique({
        where: { name: "SUPER_ADMIN" },
      });
    }
    if (!adminRole) {
      return NextResponse.json(
        { error: "Failed to initialize system roles. Please check database connectivity." },
        { status: 500 }
      );
    }

    // 3. No duplicate admin email.
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: adminUser.email, mode: "insensitive" } },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    const result = await prisma.$transaction(async (tx: any) => {
      // Create school and branding
      const createdSchool = await tx.school.create({
        data: {
          id: SCHOOL_ID,
          name: school.name,
          email: school.email,
          phone: school.phone,
          address: school.address,
          website: school.website,
          motto: school.motto,
          isActive: true,
          isSetup: true,
        },
      });

      await tx.schoolBranding.create({
        data: {
          schoolId: createdSchool.id,
          primaryColor: "#0B1F4D",
          secondaryColor: "#0E9F6E",
          reportCardTheme: "classic",
          invoiceTheme: "clean",
          receiptTheme: "simple",
        },
      });

      // Create academic session and term
      const createdSession = await tx.session.create({
        data: {
          schoolId: SCHOOL_ID,
          name: session.name,
          isCurrent: true,
          status: "ACTIVE",
          startDate: parseDate(session.startDate),
          endDate: parseDate(session.endDate),
        },
      });

      const createdTerm = await tx.term.create({
        data: {
          schoolId: SCHOOL_ID,
          sessionId: createdSession.id,
          name: term.name,
          isCurrent: true,
          status: "ACTIVE",
          startDate: parseDate(term.startDate),
          endDate: parseDate(term.endDate),
        },
      });

      // Create the first administrator
      const user = await tx.user.create({
        data: {
          name: adminUser.name,
          email: adminUser.email.toLowerCase(),
          password: hashedPassword,
          roleId: adminRole.id,
          schoolId: SCHOOL_ID,
          isActive: true,
        },
      });

      // Set active session and term settings
      const settings = [
        { key: "active_session_id", value: String(createdSession.id) },
        { key: "active_term_id", value: String(createdTerm.id) },
        { key: `user_context_session_${user.id}`, value: String(createdSession.id) },
        { key: `user_context_term_${user.id}`, value: String(createdTerm.id) },
        {
          key: "setup_wizard_status",
          value: JSON.stringify({
            setupCompleted: true,
            lastCompletedStep: 7,
            completedSteps: [
              "school-profile",
              "academic-setup",
              "classes-arms",
              "subjects",
              "grading-assessment",
              "finance-setup",
              "users-roles",
            ],
            updatedAt: new Date().toISOString(),
          }),
        },
      ];

      await Promise.all(
        settings.map((s) =>
          tx.schoolSetting.upsert({
            where: { schoolId_key: { schoolId: SCHOOL_ID, key: s.key } },
            create: { schoolId: SCHOOL_ID, key: s.key, value: s.value },
            update: { value: s.value },
          })
        )
      );

      return { user, session: createdSession, term: createdTerm };
    });

    return NextResponse.json({
      success: true,
      message: "School activated successfully",
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
    });
  } catch (error) {
    console.error("Activation error:", error);
    return NextResponse.json(
      { error: "Failed to activate school. Please check the application logs." },
      { status: 500 }
    );
  }
}
