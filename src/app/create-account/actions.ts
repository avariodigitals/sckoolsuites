"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { RoleType } from "@/lib/db-types";

const schema = z.object({
  schoolName: z.string().min(2),
  schoolEmail: z.string().email(),
  schoolPhone: z.string().min(7),
  schoolAddress: z.string().min(4),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

export async function createAccountAction(payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Please check the form values and try again." };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.adminEmail.toLowerCase() } });
  if (exists) {
    return { ok: false, message: "An account with this email already exists." };
  }

  const school = await prisma.school.create({
    data: {
      name: parsed.data.schoolName,
      email: parsed.data.schoolEmail,
      phone: parsed.data.schoolPhone,
      address: parsed.data.schoolAddress,
      website: "",
      motto: "",
    },
  });

  await prisma.schoolBranding.create({
    data: {
      schoolId: school.id,
      primaryColor: "#0B1F4D",
      secondaryColor: "#0E9F6E",
      reportCardTheme: "premium-classic",
      invoiceTheme: "premium-clean",
      receiptTheme: "premium-minimal",
    },
  });

  const role = await prisma.role.findUnique({ where: { name: RoleType.SCHOOL_ADMIN } });
  if (!role) {
    return { ok: false, message: "Role setup is incomplete. Run database seed first." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 10);

  await prisma.user.create({
    data: {
      schoolId: school.id,
      roleId: role.id,
      name: parsed.data.adminName,
      email: parsed.data.adminEmail.toLowerCase(),
      password: passwordHash,
      isActive: true,
    },
  });

  const session = await prisma.session.findFirst({ where: { schoolId: school.id } });
  if (!session) {
    const createdSession = await prisma.session.create({
      data: {
        schoolId: school.id,
        name: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        isCurrent: true,
      },
    });

    await prisma.term.create({
      data: {
        schoolId: school.id,
        sessionId: createdSession.id,
        name: "First Term",
        isCurrent: true,
      },
    });
  }

  return { ok: true, message: "Account created successfully. You can now sign in." };
}
