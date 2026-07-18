import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  schoolName: z.string().min(2),
  address: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(7),
  website: z.string().optional().nullable(),
  motto: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().min(4),
  secondaryColor: z.string().min(4),
  principalSignature: z.string().optional().nullable(),
  teacherSignature: z.string().optional().nullable(),
  schoolStamp: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "branding");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId || "default";
  if (!schoolId) {
    return NextResponse.json({ error: "No school selected" }, { status: 400 });
  }

  const json = await request.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: parsed.data.schoolName,
        address: parsed.data.address,
        email: parsed.data.email,
        phone: parsed.data.phone,
        website: parsed.data.website,
        motto: parsed.data.motto,
      },
    });

    await prisma.schoolBranding.upsert({
      where: { schoolId },
      update: {
        logoUrl: parsed.data.logoUrl,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        principalSignature: parsed.data.principalSignature,
        teacherSignature: parsed.data.teacherSignature,
        schoolStamp: parsed.data.schoolStamp,
      },
      create: {
        schoolId,
        logoUrl: parsed.data.logoUrl,
        primaryColor: parsed.data.primaryColor,
        secondaryColor: parsed.data.secondaryColor,
        principalSignature: parsed.data.principalSignature,
        teacherSignature: parsed.data.teacherSignature,
        schoolStamp: parsed.data.schoolStamp,
      },
    });

    // Invalidate cached pages so logo/colors update immediately
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/settings", "layout");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/branding] Error saving branding:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save branding settings" },
      { status: 500 }
    );
  }
}
