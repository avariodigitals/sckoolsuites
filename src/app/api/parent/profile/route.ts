import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  address: z.string().optional().default(""),
  emergencyContact: z.string().optional().default(""),
});

async function getParentContext() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARENT" ) return null;

  const parent = await prisma.parent.findFirst({
    where: { schoolId: "default", userId: session.user.id },
    include: { user: true },
  });

  if (!parent) return null;
  return { session, parent };
}

export async function GET() {
  const context = await getParentContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = {
    phone: `parent_profile_phone_${context.parent.id}`,
    address: `parent_profile_address_${context.parent.id}`,
    emergencyContact: `parent_profile_emergency_${context.parent.id}`,
  };

  const settings = await prisma.schoolSetting.findMany({
    where: {
      key: { in: [keys.phone, keys.address, keys.emergencyContact] },
    },
  });

  const map = new Map(settings.map((item) => [item.key, item.value]));

  return NextResponse.json({
    name: context.parent.user.name,
    email: context.parent.user.email,
    phone: map.get(keys.phone) ?? "",
    address: map.get(keys.address) ?? "",
    emergencyContact: map.get(keys.emergencyContact) ?? "",
  });
}

export async function POST(request: Request) {
  const context = await getParentContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: context.parent.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
    },
  });

  const values = [
    { key: `parent_profile_phone_${context.parent.id}`, value: parsed.data.phone },
    { key: `parent_profile_address_${context.parent.id}`, value: parsed.data.address },
    { key: `parent_profile_emergency_${context.parent.id}`, value: parsed.data.emergencyContact },
  ];

  await Promise.all(values.map((item) => prisma.schoolSetting.upsert({
    where: { key: item.key },
    update: { value: item.value },
    create: { key: item.key, value: item.value },
  })));

  return NextResponse.json({ ok: true });
}
