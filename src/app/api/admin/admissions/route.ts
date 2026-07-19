import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

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

const addressSchema = z.object({
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  zipcode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
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

const createSchema = z.object({
  sessionId: z.coerce.string().optional().nullable(),
  enrollmentType: z.enum(["PRIVATE", "REGULAR"]).default("REGULAR"),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
  email: z.string().email(),
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
  presentAddress: addressSchema.optional().nullable(),
  permanentAddress: addressSchema.optional().nullable(),
  previousInstitute: z.string().max(100).optional().nullable(),
  previousClass: z.string().max(50).optional().nullable(),
  applyingForClassId: z.coerce.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  lastSchoolReportUrl: z.string().max(500).optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
  guardians: z.array(guardianSchema).max(5).default([]),
  documents: z.array(documentSchema).max(10).default([]),
  qualifications: z.array(qualificationSchema).max(10).default([]),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN", "REGISTRAR"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "admissions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    const [applications, classes, sessions] = await Promise.all([
      prisma.admissionApplication.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.class.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      }),
      prisma.session.findMany({
        where: { schoolId },
        orderBy: { startDate: "desc" },
      }),
    ]);

    // Get guardians for each application
    const appIds = applications.map((a: any) => a.id);
    let guardians: any[] = [];
    let documents: any[] = [];
    let qualifications: any[] = [];
    if (appIds.length > 0) {
      [guardians, documents, qualifications] = await Promise.all([
        prisma.admissionGuardian.findMany({ where: { applicationId: { in: appIds } } }),
        prisma.admissionDocument.findMany({ where: { applicationId: { in: appIds } } }),
        prisma.admissionQualification.findMany({ where: { applicationId: { in: appIds } } }),
      ]);
    }

    const guardiansByApp: Record<number, any[]> = {};
    for (const g of guardians) {
      const appId = g.applicationId;
      if (!guardiansByApp[appId]) guardiansByApp[appId] = [];
      guardiansByApp[appId].push({
        id: String(g.id),
        name: g.name,
        email: g.email,
        contactNumber: g.contactNumber,
        relationship: g.relationship,
        isNew: g.isNew,
        occupation: g.occupation,
        employerName: g.employerName,
        workAddress: g.workAddress,
        workPhone: g.workPhone,
        homeAddress: g.homeAddress,
        idDocumentType: g.idDocumentType,
        idDocumentNumber: g.idDocumentNumber,
        idDocumentUrl: g.idDocumentUrl,
        photoUrl: g.photoUrl,
        isPrimary: g.isPrimary,
      });
    }

    const documentsByApp: Record<number, any[]> = {};
    for (const d of documents) {
      const appId = d.applicationId;
      if (!documentsByApp[appId]) documentsByApp[appId] = [];
      documentsByApp[appId].push({
        id: String(d.id),
        documentType: d.documentType,
        title: d.title,
        issueDate: d.issueDate,
        validityStart: d.validityStart,
        description: d.description,
        fileUrl: d.fileUrl,
      });
    }

    const qualificationsByApp: Record<number, any[]> = {};
    for (const q of qualifications) {
      const appId = q.applicationId;
      if (!qualificationsByApp[appId]) qualificationsByApp[appId] = [];
      qualificationsByApp[appId].push({
        id: String(q.id),
        qualificationLevel: q.qualificationLevel,
        course: q.course,
        session: q.session,
        institute: q.institute,
        instituteAddress: q.instituteAddress,
        affiliatedTo: q.affiliatedTo,
        startDate: q.startDate,
        endDate: q.endDate,
        result: q.result,
        fileUrl: q.fileUrl,
      });
    }

    return NextResponse.json({
      applications: applications.map((app: any) => ({
        id: String(app.id),
        applicantNumber: app.applicantNumber,
        sessionId: app.sessionId ? String(app.sessionId) : null,
        enrollmentType: app.enrollmentType,
        dateOfRegistration: app.dateOfRegistration,
        firstName: app.firstName,
        lastName: app.lastName,
        name: app.name,
        email: app.email,
        contactNumber: app.contactNumber,
        alternateContactNumber: app.alternateContactNumber,
        alternateEmail: app.alternateEmail,
        gender: app.gender,
        dateOfBirth: app.dateOfBirth,
        age: app.age,
        birthPlace: app.birthPlace,
        nationality: app.nationality,
        motherTongue: app.motherTongue,
        bloodGroup: app.bloodGroup,
        religion: app.religion,
        address: app.address,
        presentAddress: app.presentAddress,
        permanentAddress: app.permanentAddress,
        previousInstitute: app.previousInstitute,
        previousClass: app.previousClass,
        applyingForClassId: app.applyingForClassId ? String(app.applyingForClassId) : null,
        lastSchoolReportUrl: app.lastSchoolReportUrl || null,
        photoUrl: app.photoUrl || null,
        notes: app.notes,
        status: app.status,
        testScore: app.testScore,
        interviewNotes: app.interviewNotes,
        convertedStudentId: app.convertedStudentId ? String(app.convertedStudentId) : null,
        guardians: guardiansByApp[app.id] ?? [],
        documents: documentsByApp[app.id] ?? [],
        qualifications: qualificationsByApp[app.id] ?? [],
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      classes: classes.map((c: any) => ({ id: String(c.id), name: c.name })),
      sessions: sessions.map((s: any) => ({ id: String(s.id), name: s.name })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load applications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "admissions");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const data = parsed.data;

  // Check email not already in use by a user
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Email already in use by an existing user" }, { status: 409 });
  }

  // Generate applicant number
  const countResult = await prisma.admissionApplication.count({ where: { schoolId } });
  const applicantNumber = `APP-${String(countResult + 1).padStart(4, "0")}`;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const application = await tx.admissionApplication.create({
        data: {
          schoolId,
          sessionId: data.sessionId ? Number(data.sessionId) : null,
          applicantNumber,
          enrollmentType: data.enrollmentType,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          contactNumber: data.contactNumber?.trim() || null,
          alternateContactNumber: data.alternateContactNumber?.trim() || null,
          alternateEmail: data.alternateEmail?.trim().toLowerCase() || null,
          gender: data.gender || null,
          dateOfBirth: data.dateOfBirth || null,
          age: data.age ?? null,
          birthPlace: data.birthPlace?.trim() || null,
          nationality: data.nationality?.trim() || null,
          motherTongue: data.motherTongue?.trim() || null,
          bloodGroup: data.bloodGroup?.trim() || null,
          religion: data.religion?.trim() || null,
          address: data.address?.trim() || null,
          presentAddress: data.presentAddress || null,
          permanentAddress: data.permanentAddress || null,
          previousInstitute: data.previousInstitute?.trim() || null,
          previousClass: data.previousClass?.trim() || null,
          applyingForClassId: data.applyingForClassId ? Number(data.applyingForClassId) : null,
          notes: data.notes?.trim() || null,
          lastSchoolReportUrl: data.lastSchoolReportUrl?.trim() || null,
          photoUrl: data.photoUrl?.trim() || null,
          status: "PENDING",
        },
      });

      // Create guardians
      for (const g of data.guardians) {
        await tx.admissionGuardian.create({
          data: {
            applicationId: application.id,
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

      // Create documents
      for (const d of data.documents) {
        await tx.admissionDocument.create({
          data: {
            applicationId: application.id,
            documentType: d.documentType?.trim() || null,
            title: d.title.trim(),
            issueDate: d.issueDate || null,
            validityStart: d.validityStart || null,
            description: d.description?.trim() || null,
            fileUrl: d.fileUrl?.trim() || null,
          },
        });
      }

      // Create qualifications
      for (const q of data.qualifications) {
        await tx.admissionQualification.create({
          data: {
            applicationId: application.id,
            qualificationLevel: q.qualificationLevel?.trim() || null,
            course: q.course?.trim() || null,
            session: q.session?.trim() || null,
            institute: q.institute?.trim() || null,
            instituteAddress: q.instituteAddress?.trim() || null,
            affiliatedTo: q.affiliatedTo?.trim() || null,
            startDate: q.startDate || null,
            endDate: q.endDate || null,
            result: q.result?.trim() || null,
            fileUrl: q.fileUrl?.trim() || null,
          },
        });
      }

      return application;
    });

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action: "ADMISSION_CREATED",
      targetType: "AdmissionApplication",
      targetId: String(result.id),
      metadata: { applicantNumber, name: `${data.firstName} ${data.lastName}`, email: data.email },
    });

    return NextResponse.json({
      application: {
        id: String(result.id),
        applicantNumber: result.applicantNumber,
        name: `${data.firstName} ${data.lastName}`,
        email: result.email,
        status: result.status,
        createdAt: result.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create application";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
