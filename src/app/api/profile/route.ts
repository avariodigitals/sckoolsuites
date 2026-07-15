import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/auth";
import { humanizeEnum } from "@/lib/utils";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [role, school] = await Promise.all([
    user.roleId ? prisma.role.findUnique({ where: { id: user.roleId } }) : Promise.resolve(null),
    user.schoolId ? prisma.school.findUnique({ where: { id: user.schoolId } }) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      roleId: user.roleId,
      roleName: humanizeEnum(role?.name),
      schoolId: user.schoolId,
      schoolName: school?.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    },
  });
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await request.json();
    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Only admins can change email address
    const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "SCHOOL_ADMIN";
    if (data.email !== undefined && data.email !== session.user.email && !isAdmin) {
      return NextResponse.json(
        { error: "Only administrators can change email addresses. Contact an admin for assistance." },
        { status: 403 }
      );
    }

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
    if (data.address !== undefined) updateData.address = data.address?.trim() || null;

    let user;
    try {
      user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });
    } catch (err: any) {
      // Fallback: if phone/address columns don't exist yet, retry with core fields only
      if (err.message?.includes("phone") || err.message?.includes("address")) {
        const coreData: Record<string, any> = {};
        if (data.name !== undefined) coreData.name = data.name.trim();
        if (data.email !== undefined) coreData.email = data.email.trim();
        user = await prisma.user.update({
          where: { id: session.user.id },
          data: coreData,
        });
      } else {
        throw err;
      }
    }

    const role = user.roleId ? await prisma.role.findUnique({ where: { id: user.roleId } }) : null;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        roleId: user.roleId,
        roleName: humanizeEnum(role?.name),
        avatarUrl: user.avatarUrl ?? null,
        isActive: user.isActive,
      },
    });
  } catch (err: any) {
    console.error("[profile PUT] error:", err.message, err.stack);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const parsed = passwordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  // Verify current password by re-hashing comparison
  // Since we can't verify directly with bcrypt here easily without importing bcrypt.compare,
  // We'll rely on the auth system. For now we'll just hash the new password.
  // In a production system, you'd import bcrypt and compare.
  const { compare } = await import("bcryptjs");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed, mustChangePassword: false },
  });

  return NextResponse.json({ success: true });
}
