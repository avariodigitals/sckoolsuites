import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";
import { Prisma } from "@prisma/client";

const addressSchema = z.object({
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zipcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
}).optional().nullable();

const guardianSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().nullable(),
  contactNumber: z.string().max(20).optional().nullable(),
  relationship: z.string().min(1).max(30),
  isNew: z.boolean().default(true),
  occupation: z.string().max(100).optional().nullable(),
  employerName: z.string().max(120).optional().nullable(),
  workAddress: z.string().max(300).optional().nullable(),
  workPhone: z.string().max(20).optional().nullable(),
  homeAddress: z.string().max(300).optional().nullable(),
  idDocumentType: z.string().max(50).optional().nullable(),
  idDocumentNumber: z.string().max(50).optional().nullable(),
  idDocumentUrl: z.string().max(500).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
  isPrimary: z.boolean().default(false),
});

const documentSchema = z.object({
  documentType: z.string().max(50).optional().nullable(),
  title: z.string().min(1).max(120),
  issueDate: z.string().optional().nullable(),
  validityStart: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
});

const qualificationSchema = z.object({
  qualificationLevel: z.string().max(50).optional().nullable(),
  course: z.string().max(100).optional().nullable(),
  session: z.string().max(50).optional().nullable(),
  institute: z.string().max(100).optional().nullable(),
  instituteAddress: z.string().max(200).optional().nullable(),
  affiliatedTo: z.string().max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  result: z.string().max(50).optional().nullable(),
  fileUrl: z.string().max(500).optional().nullable(),
});

const updateSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  email: z.string().email().optional(),
  contactNumber: z.string().max(20).optional().nullable(),
  alternateContactNumber: z.string().max(20).optional().nullable(),
  alternateEmail: z.string().email().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  age: z.coerce.number().int().min(3).max(30).optional().nullable(),
  birthPlace: z.string().max(100).optional().nullable(),
  nationality: z.string().max(50).optional().nullable(),
  motherTongue: z.string().max(50).optional().nullable(),
  bloodGroup: z.string().max(10).optional().nullable(),
  religion: z.string().max(50).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  presentAddress: addressSchema,
  permanentAddress: addressSchema,
  previousInstitute: z.string().max(100).optional().nullable(),
  previousClass: z.string().max(50).optional().nullable(),
  applyingForClassId: z.coerce.number().int().min(1).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  lastSchoolReportUrl: z.string().max(500).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
  status: z.enum(["PENDING", "TESTED", "INTERVIEWED", "APPROVED", "REJECTED", "WITHDRAWN"]).optional(),
  testScore: z.coerce.number().int().min(0).max(100).optional().nullable(),
  interviewNotes: z.string().max(500).optional().nullable(),
  guardians: z.array(guardianSchema).max(5).optional(),
  documents: z.array(documentSchema).max(10).optional(),
  qualifications: z.array(qualificationSchema).max(10).optional(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "PATCH", "admissions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "admission id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid admission id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  const existing = await prisma.admissionApplication.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update application fields
      const appData: Prisma.AdmissionApplicationUpdateInput = {};
      if (data.firstName !== undefined) appData.firstName = data.firstName.trim();
      if (data.lastName !== undefined) appData.lastName = data.lastName.trim();
      if (data.email !== undefined) appData.email = data.email.trim().toLowerCase();
      if (data.contactNumber !== undefined) appData.contactNumber = data.contactNumber?.trim() || null;
      if (data.alternateContactNumber !== undefined) appData.alternateContactNumber = data.alternateContactNumber?.trim() || null;
      if (data.alternateEmail !== undefined) appData.alternateEmail = data.alternateEmail?.trim().toLowerCase() || null;
      if (data.gender !== undefined) appData.gender = data.gender || null;
      if (data.dateOfBirth !== undefined) appData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
      if (data.age !== undefined) appData.age = data.age ?? null;
      if (data.birthPlace !== undefined) appData.birthPlace = data.birthPlace?.trim() || null;
      if (data.nationality !== undefined) appData.nationality = data.nationality?.trim() || null;
      if (data.motherTongue !== undefined) appData.motherTongue = data.motherTongue?.trim() || null;
      if (data.bloodGroup !== undefined) appData.bloodGroup = data.bloodGroup?.trim() || null;
      if (data.religion !== undefined) appData.religion = data.religion?.trim() || null;
      if (data.address !== undefined) appData.address = data.address?.trim() || null;
      if (data.presentAddress !== undefined) appData.presentAddress = data.presentAddress === null ? Prisma.JsonNull : data.presentAddress;
      if (data.permanentAddress !== undefined) appData.permanentAddress = data.permanentAddress === null ? Prisma.JsonNull : data.permanentAddress;
      if (data.previousInstitute !== undefined) appData.previousInstitute = data.previousInstitute?.trim() || null;
      if (data.previousClass !== undefined) appData.previousClass = data.previousClass?.trim() || null;
      if (data.applyingForClassId !== undefined) {
        appData.applyingForClass = data.applyingForClassId === null ? { disconnect: true } : { connect: { id: data.applyingForClassId } };
      }
      if (data.notes !== undefined) appData.notes = data.notes?.trim() || null;
      if (data.lastSchoolReportUrl !== undefined) appData.lastSchoolReportUrl = data.lastSchoolReportUrl?.trim() || null;
      if (data.photoUrl !== undefined) appData.photoUrl = data.photoUrl?.trim() || null;
      if (data.status !== undefined) appData.status = data.status;
      if (data.testScore !== undefined) appData.testScore = data.testScore ?? null;
      if (data.interviewNotes !== undefined) appData.interviewNotes = data.interviewNotes?.trim() || null;

      const application = await tx.admissionApplication.update({
        where: { id: parsedId },
        data: appData,
      });

      // Replace guardians if provided
      if (data.guardians !== undefined) {
        await tx.admissionGuardian.deleteMany({ where: { applicationId: parsedId } });
        for (const g of data.guardians) {
          await tx.admissionGuardian.create({
            data: {
              applicationId: parsedId,
              name: g.name.trim(),
              email: g.email?.trim().toLowerCase() || null,
              contactNumber: g.contactNumber?.trim() || null,
              relationship: g.relationship.trim(),
              isNew: g.isNew,
              occupation: g.occupation?.trim() || null,
              employerName: g.employerName?.trim() || null,
              workAddress: g.workAddress?.trim() || null,
              workPhone: g.workPhone?.trim() || null,
              homeAddress: g.homeAddress?.trim() || null,
              idDocumentType: g.idDocumentType?.trim() || null,
              idDocumentNumber: g.idDocumentNumber?.trim() || null,
              idDocumentUrl: g.idDocumentUrl?.trim() || null,
              photoUrl: g.photoUrl?.trim() || null,
              isPrimary: g.isPrimary,
            },
          });
        }
      }

      // Replace documents if provided
      if (data.documents !== undefined) {
        await tx.admissionDocument.deleteMany({ where: { applicationId: parsedId } });
        for (const d of data.documents) {
          await tx.admissionDocument.create({
            data: {
              applicationId: parsedId,
              documentType: d.documentType?.trim() || null,
              title: d.title.trim(),
              issueDate: d.issueDate ? new Date(d.issueDate) : null,
              validityStart: d.validityStart ? new Date(d.validityStart) : null,
              description: d.description?.trim() || null,
              fileUrl: d.fileUrl?.trim() || null,
            },
          });
        }
      }

      // Replace qualifications if provided
      if (data.qualifications !== undefined) {
        await tx.admissionQualification.deleteMany({ where: { applicationId: parsedId } });
        for (const q of data.qualifications) {
          await tx.admissionQualification.create({
            data: {
              applicationId: parsedId,
              qualificationLevel: q.qualificationLevel?.trim() || null,
              course: q.course?.trim() || null,
              session: q.session?.trim() || null,
              institute: q.institute?.trim() || null,
              instituteAddress: q.instituteAddress?.trim() || null,
              affiliatedTo: q.affiliatedTo?.trim() || null,
              startDate: q.startDate ? new Date(q.startDate) : null,
              endDate: q.endDate ? new Date(q.endDate) : null,
              result: q.result?.trim() || null,
              fileUrl: q.fileUrl?.trim() || null,
            },
          });
        }
      }

      return application;
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ADMISSION_UPDATED",
      targetType: "AdmissionApplication",
      targetId: String(parsedId),
      metadata: { updates: Object.keys(data) },
    });

    return NextResponse.json({ ok: true, application: { id: String(result.id) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "admissions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "admission id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid admission id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  const existing = await prisma.admissionApplication.findFirst({
    where: { id: parsedId, schoolId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    await prisma.admissionApplication.update({
      where: { id: parsedId },
      data: { status: "WITHDRAWN" },
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ADMISSION_WITHDRAWN",
      targetType: "AdmissionApplication",
      targetId: String(parsedId),
      metadata: { applicantNumber: existing.applicantNumber },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to withdraw application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
