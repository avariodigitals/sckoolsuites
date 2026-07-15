import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const STAFF_ROLES = [
  "TEACHER",
  "SCHOOL_ADMIN",
  "HEAD_OF_SCHOOL",
  "PRINCIPAL",
  "HEAD_TEACHER",
  "HEAD_OF_DEPARTMENT",
  "ACCOUNTANT",
  "REGISTRAR",
  "RECEPTIONIST",
  "SUPER_ADMIN",
];

const clockInSchema = z.object({
  type: z.enum(["CLOCK_IN", "CLOCK_OUT"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Only staff members can clock in" }, { status: 403 });
  }

  const schoolId = session.user.schoolId || "default";
  const formData = await request.formData();

  const file = formData.get("facePhoto");
  const type = String(formData.get("type") ?? "");
  const latitudeStr = formData.get("latitude");
  const longitudeStr = formData.get("longitude");
  const note = formData.get("note");

  const parsed = clockInSchema.safeParse({
    type,
    latitude: latitudeStr ? parseFloat(String(latitudeStr)) : undefined,
    longitude: longitudeStr ? parseFloat(String(longitudeStr)) : undefined,
    note: note ? String(note) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Face photo is required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Face photo must be an image" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Face photo must be 5MB or less" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let facePhotoUrl: string | null = null;
  try {
    const uploadResult = await uploadToCloudinary(buffer, file.type, {
      schoolId,
      folder: "staff-attendance",
    });
    facePhotoUrl = uploadResult.url;
  } catch {
    return NextResponse.json({ error: "Failed to upload face photo" }, { status: 500 });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId: session.user.id },
    select: { id: true },
  });

  const record = await prisma.staffAttendance.create({
    data: {
      schoolId,
      userId: session.user.id,
      teacherId: teacher?.id ?? null,
      type: parsed.data.type,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      facePhotoUrl,
      note: parsed.data.note ?? null,
    },
  });

  await createAuditLog({
    schoolId,
    actorUserId: session.user.id,
    action: parsed.data.type === "CLOCK_IN" ? "STAFF_CLOCK_IN" : "STAFF_CLOCK_OUT",
    targetType: "StaffAttendance",
    targetId: record.id,
    metadata: {
      type: parsed.data.type,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  return NextResponse.json({
    ok: true,
    id: record.id,
    type: record.type,
    timestamp: record.timestamp.toISOString(),
    facePhotoUrl: record.facePhotoUrl,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = session.user.schoolId || "default";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const records = await prisma.staffAttendance.findMany({
    where: {
      schoolId,
      userId: session.user.id,
      timestamp: { gte: todayStart },
    },
    orderBy: { timestamp: "desc" },
    take: 10,
  });

  const lastClockIn = records.find((r) => r.type === "CLOCK_IN");
  const lastClockOut = records.find((r) => r.type === "CLOCK_OUT");
  const isClockedIn = lastClockIn && (!lastClockOut || lastClockIn.timestamp > lastClockOut.timestamp);

  return NextResponse.json({
    isClockedIn: !!isClockedIn,
    lastClockIn: lastClockIn
      ? { timestamp: lastClockIn.timestamp.toISOString(), facePhotoUrl: lastClockIn.facePhotoUrl }
      : null,
    lastClockOut: lastClockOut
      ? { timestamp: lastClockOut.timestamp.toISOString() }
      : null,
    todayRecords: records.map((r) => ({
      id: r.id,
      type: r.type,
      timestamp: r.timestamp.toISOString(),
      latitude: r.latitude,
      longitude: r.longitude,
      facePhotoUrl: r.facePhotoUrl,
    })),
  });
}
