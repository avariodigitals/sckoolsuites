import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSetupWizardState, saveSetupWizardStatus, setupStepOrder } from "@/lib/setup-wizard";

const requestSchema = z.object({
  step: z.enum(setupStepOrder),
  data: z.record(z.string(), z.unknown()).default({}),
});

function isAuthorized(role?: string) {
  return role ? ["SUPER_ADMIN", "SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL"].includes(role) : false;
}

function asString(value: unknown) {
  return String(value ?? "").trim();
}

function parseDelimitedRows(input: unknown) {
  return String(input ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()));
}

function parseDelimitedList(input: unknown) {
  return String(input ?? "")
    .split(/\r?\n|,/)
    .map((item: any) => item.trim())
    .filter(Boolean);
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";
  const [school, appIconSetting, activeSessionSetting, activeTermSetting, groupGradingProfilesSetting, sessions, terms, classGroups, classes, arms, subjects, feeGroups, feeItems, teachers, parents, students, setup] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, include: { branding: true } }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "app_icon_logo" }, select: { value: true } }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "active_session_id" }, select: { value: true } }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "active_term_id" }, select: { value: true } }),
    prisma.schoolSetting.findFirst({ where: { schoolId, key: "setup_group_grading_profiles" }, select: { value: true } }),
    prisma.session.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.term.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    prisma.classGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { schoolId }, include: { classGroup: true }, orderBy: { name: "asc" } }),
    prisma.classArm.findMany({ where: { schoolId }, include: { class: true }, orderBy: { name: "asc" } }),
    prisma.subject.findMany({ where: { schoolId }, include: { class: true, classGroup: true, teacher: { include: { user: true } } }, orderBy: { name: "asc" } }),
    prisma.feeGroup.findMany({ where: { schoolId }, orderBy: { name: "asc" } }),
    prisma.feeItem.findMany({ where: { schoolId }, include: { feeGroup: true, class: true, arm: true, session: true, term: true }, orderBy: { createdAt: "asc" } }),
    prisma.teacher.findMany({ where: { schoolId }, include: { user: true } }),
    prisma.parent.findMany({ where: { schoolId }, include: { user: true } }),
    prisma.student.findMany({ where: { schoolId }, include: { user: true, class: true, parent: { include: { user: true } } } }),
    getSetupWizardState(schoolId),
  ]);

  return NextResponse.json({
    school,
    activeSessionId: activeSessionSetting?.value ?? null,
    activeTermId: activeTermSetting?.value ?? null,
    groupGradingProfiles: groupGradingProfilesSetting?.value ?? "",
    sessions,
    terms,
    classGroups,
    classes,
    arms,
    subjects: subjects.map((item: any) => ({
      id: item.id,
      name: item.name,
      class: item.class ? { name: item.class.name } : null,
      classNames: item.classNames,
      classGroup: item.classGroup ? { name: item.classGroup.name } : null,
      classGroupNames: item.classGroupNames,
    })),
    feeGroups,
    feeItems,
    appIconLogo: appIconSetting?.value ?? "",
    teachers: teachers.map((item: any) => ({ id: item.id, name: item.user.name, email: item.user.email, avatarUrl: item.user.avatarUrl })),
    parents: parents.map((item: any) => ({ id: item.id, name: item.user.name, email: item.user.email, avatarUrl: item.user.avatarUrl })),
    students: students.map((item: any) => ({ id: item.id, name: item.user.name, email: item.user.email, className: item.class?.name, parentEmail: item.parent?.user.email, passportUrl: item.passportUrl })),
    setup,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schoolId = "default";
  const { step, data } = parsed.data;

  try {
    // Handle old school-profile format (from old wizard)
    if (step === "school-profile" && data.schoolName !== undefined) {
      const schoolName = asString(data.schoolName);
      const address = asString(data.address);
      const phone = asString(data.phone);
      const email = asString(data.email);
      const website = asString(data.website);
      const logoUrl = asString(data.logoUrl);
      const appIconLogo = asString(data.appIconLogo);
      const reportHeaderPreference = asString(data.reportHeaderPreference);

      await prisma.school.update({
        where: { id: schoolId },
        data: { name: schoolName, address, phone, email, website: website || null },
      });

      await prisma.schoolBranding.upsert({
        where: { schoolId },
        update: {
          logoUrl: logoUrl || null,
          reportHeaderText: reportHeaderPreference || null,
        },
        create: {
          schoolId,
          logoUrl: logoUrl || null,
          reportHeaderText: reportHeaderPreference || null,
        },
      });

      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "app_icon_logo" } },
        update: { value: appIconLogo },
        create: { schoolId, key: "app_icon_logo", value: appIconLogo },
      });
    }

    // Handle old academic-setup format (from old wizard)
    if (step === "academic-setup" && data.currentSession !== undefined) {
      const sessionName = asString(data.currentSession);
      const termName = asString(data.currentTerm);
      const startDate = asString(data.termStartDate);
      const endDate = asString(data.termEndDate);
      const resultPublicationSetting = asString(data.resultPublicationSetting);

      const currentSession = await prisma.session.upsert({
        where: { schoolId_name: { schoolId, name: sessionName } },
        update: { isCurrent: true, status: "ACTIVE" },
        create: { schoolId, name: sessionName, isCurrent: true, status: "ACTIVE" },
      });

      await prisma.session.updateMany({
        where: { schoolId, id: { not: currentSession.id }, isCurrent: true },
        data: { isCurrent: false },
      });

      const currentTerm = await prisma.term.upsert({
        where: { sessionId_name: { sessionId: currentSession.id, name: termName } },
        update: {
          isCurrent: true,
          status: "ACTIVE",
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
        create: {
          schoolId,
          sessionId: currentSession.id,
          name: termName,
          isCurrent: true,
          status: "ACTIVE",
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      });

      await prisma.term.updateMany({
        where: { schoolId, id: { not: currentTerm.id }, isCurrent: true },
        data: { isCurrent: false },
      });

      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "active_session_id" } },
        update: { value: String(currentSession.id) },
        create: { schoolId, key: "active_session_id", value: String(currentSession.id) },
      });

      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "active_term_id" } },
        update: { value: String(currentTerm.id) },
        create: { schoolId, key: "active_term_id", value: String(currentTerm.id) },
      });

      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "result_publication_setting" } },
        update: { value: resultPublicationSetting || "manual" },
        create: { schoolId, key: "result_publication_setting", value: resultPublicationSetting || "manual" },
      });
    }

    // Handle new simplified school profile format
    // Note: data already contains { profile } or { academic } directly
    const newFormatData = data as Record<string, unknown>;
    
    if (step === "school-profile" && newFormatData.profile) {
      const profile = newFormatData.profile as Record<string, string>;
      
      const updateData: Record<string, string | null | undefined> = {};
      
      if (profile.name) updateData.name = profile.name;
      if (profile.email) updateData.email = profile.email;
      if (profile.phone !== undefined) updateData.phone = profile.phone || null;
      if (profile.address !== undefined) updateData.address = profile.address || null;
      if (profile.website !== undefined) updateData.website = profile.website || null;
      if (profile.motto !== undefined) updateData.motto = profile.motto || null;
      
      await prisma.school.update({
        where: { id: schoolId },
        data: updateData,
      });
    }

    // Handle new simplified academic setup format
    if (step === "academic-setup" && newFormatData.academic) {
      const academic = newFormatData.academic as {
        sessions: Array<{ id: string; name: string; startDate?: string; endDate?: string }>;
        terms: Array<{ id: string; name: string; sessionId: string; startDate?: string; endDate?: string }>;
        currentSessionId?: string;
        currentTermId?: string;
      };

      // Create/update sessions - merge without override
      for (const session of academic.sessions || []) {
        const isTempId = session.id.startsWith("session-");
        if (isTempId) {
          // Create new session
          const newSession = await prisma.session.create({
            data: {
              schoolId,
              name: session.name,
              startDate: session.startDate ? new Date(session.startDate) : null,
              endDate: session.endDate ? new Date(session.endDate) : null,
              isCurrent: session.id === academic.currentSessionId,
              status: "ACTIVE",
            },
          });
          // Update term session references if needed
          if (session.id === academic.currentSessionId) {
            await prisma.schoolSetting.upsert({
              where: { schoolId_key: { schoolId, key: "active_session_id" } },
              update: { value: String(newSession.id) },
              create: { schoolId, key: "active_session_id", value: String(newSession.id) },
            });
          }
        } else {
          // Update existing session
          const sessionIdInt = parseInt(session.id, 10);
          await prisma.session.update({
            where: { id: sessionIdInt },
            data: {
              name: session.name,
              startDate: session.startDate ? new Date(session.startDate) : undefined,
              endDate: session.endDate ? new Date(session.endDate) : undefined,
              isCurrent: session.id === academic.currentSessionId,
            },
          });
        }
      }

      // Create/update terms - merge without override
      for (const term of academic.terms || []) {
        const isTempId = term.id.startsWith("term-");
        if (isTempId) {
          // Create new term
          const newTerm = await prisma.term.create({
            data: {
              schoolId,
              name: term.name,
              sessionId: parseInt(term.sessionId, 10),
              startDate: term.startDate ? new Date(term.startDate) : null,
              endDate: term.endDate ? new Date(term.endDate) : null,
              isCurrent: term.id === academic.currentTermId,
              status: "ACTIVE",
            },
          });
          if (term.id === academic.currentTermId) {
            await prisma.schoolSetting.upsert({
              where: { schoolId_key: { schoolId, key: "active_term_id" } },
              update: { value: String(newTerm.id) },
              create: { schoolId, key: "active_term_id", value: String(newTerm.id) },
            });
          }
        } else {
          // Update existing term
          const termIdInt = parseInt(term.id, 10);
          await prisma.term.update({
            where: { id: termIdInt },
            data: {
              name: term.name,
              sessionId: parseInt(term.sessionId, 10),
              startDate: term.startDate ? new Date(term.startDate) : undefined,
              endDate: term.endDate ? new Date(term.endDate) : undefined,
              isCurrent: term.id === academic.currentTermId,
            },
          });
        }
      }

      // Set active session/term from existing IDs
      if (academic.currentSessionId && !academic.currentSessionId.startsWith("session-")) {
        const curSessionInt = parseInt(academic.currentSessionId, 10);
        await prisma.schoolSetting.upsert({
          where: { schoolId_key: { schoolId, key: "active_session_id" } },
          update: { value: academic.currentSessionId },
          create: { schoolId, key: "active_session_id", value: academic.currentSessionId },
        });
        await prisma.session.updateMany({
          where: { schoolId, id: curSessionInt },
          data: { isCurrent: true },
        });
        await prisma.session.updateMany({
          where: { schoolId, id: { not: curSessionInt } },
          data: { isCurrent: false },
        });
      }

      if (academic.currentTermId && !academic.currentTermId.startsWith("term-")) {
        const curTermInt = parseInt(academic.currentTermId, 10);
        await prisma.schoolSetting.upsert({
          where: { schoolId_key: { schoolId, key: "active_term_id" } },
          update: { value: academic.currentTermId },
          create: { schoolId, key: "active_term_id", value: academic.currentTermId },
        });
        await prisma.term.updateMany({
          where: { schoolId, id: curTermInt },
          data: { isCurrent: true },
        });
        await prisma.term.updateMany({
          where: { schoolId, id: { not: curTermInt } },
          data: { isCurrent: false },
        });
      }
    }

    if (step === "classes-arms") {
      const rows = parseDelimitedRows(data.classArms);
      const requestedGroups = parseDelimitedList(data.classGroups);
      const groupByName = new Map<string, number>();

      for (const groupName of requestedGroups) {
        const group = await prisma.classGroup.upsert({
          where: { schoolId_name: { schoolId, name: groupName } },
          update: {},
          create: { schoolId, name: groupName },
        });
        groupByName.set(group.name.toLowerCase(), group.id);
      }

      for (const row of rows) {
        const className = asString(row[0]);
        const groupName = row.length >= 3 ? asString(row[1]) : "";
        const armsRaw = row.length >= 3 ? asString(row[2]) : asString(row[1]);
        if (!className) continue;

        const groupId: number | null = groupName
          ? (groupByName.get(groupName.toLowerCase()) ?? (
            await prisma.classGroup.upsert({
              where: { schoolId_name: { schoolId, name: groupName } },
              update: {},
              create: { schoolId, name: groupName },
            })
          ).id)
          : null;

        if (groupName && groupId !== null) {
          groupByName.set(groupName.toLowerCase(), groupId);
        }

        const classRow = await prisma.class.upsert({
          where: { schoolId_name: { schoolId, name: className } },
          update: { classGroupId: groupId },
          create: { schoolId, name: className, classGroupId: groupId },
        });

        const arms = armsRaw.split(",").map((item: any) => item.trim()).filter(Boolean);
        for (const armName of arms) {
          await prisma.classArm.upsert({
            where: { classId_name: { classId: classRow.id, name: armName } },
            update: { isActive: true },
            create: { schoolId, classId: classRow.id, name: armName, isActive: true },
          });
        }
      }

      if (requestedGroups.length > 0) {
        const requestedSet = new Set(requestedGroups.map((item: any) => item.toLowerCase()));
        const existingGroups = await prisma.classGroup.findMany({ where: { schoolId }, select: { id: true, name: true } });
        for (const group of existingGroups) {
          if (requestedSet.has(group.name.toLowerCase())) continue;
          const [classCount, subjectCount] = await Promise.all([
            prisma.class.count({ where: { schoolId, classGroup: { is: { name: group.name } } } }),
            prisma.subject.count({ where: { schoolId, classGroupNames: { contains: group.name } } }),
          ]);
          if (classCount === 0 && subjectCount === 0) {
            await prisma.classGroup.delete({ where: { id: group.id } });
          }
        }
      }
    }

    if (step === "subjects") {
      const rows = parseDelimitedRows(data.subjects);
      for (const row of rows) {
        const subjectName = asString(row[0]);
        const classNames = asString(row[1])
          .split(",")
          .map((item: any) => item.trim())
          .filter(Boolean);
        const classGroupNames = asString(row[2])
          .split(",")
          .map((item: any) => item.trim())
          .filter(Boolean);
        if (!subjectName) continue;

        const classesByName = classNames.length
          ? await prisma.class.findMany({
              where: { schoolId, name: { in: classNames } },
              select: { id: true, name: true },
            })
          : [];
        const classIdByName = new Map(classesByName.map((item: any) => [item.name, item.id]));
        const primaryClassId = classNames.length ? classIdByName.get(classNames[0]) ?? null : null;

        const groupsByName = classGroupNames.length
          ? await prisma.classGroup.findMany({
              where: { schoolId, name: { in: classGroupNames } },
              select: { id: true, name: true },
            })
          : [];
        const groupIdByName = new Map(groupsByName.map((item: any) => [item.name, item.id]));
        const primaryClassGroupId = classGroupNames.length ? groupIdByName.get(classGroupNames[0]) ?? null : null;

        const existingSubject = await prisma.subject.findFirst({ where: { schoolId, name: subjectName }, select: { id: true } });
        if (existingSubject) {
          await prisma.subject.update({
            where: { id: existingSubject.id },
            data: {
              classId: primaryClassId,
              classNames: classNames.length ? classNames.join(", ") : null,
              classGroupId: primaryClassGroupId,
              classGroupNames: classGroupNames.length ? classGroupNames.join(", ") : null,
            },
          });
        } else {
          await prisma.subject.create({
            data: {
              schoolId,
              name: subjectName,
              classId: primaryClassId,
              classNames: classNames.length ? classNames.join(", ") : null,
              classGroupId: primaryClassGroupId,
              classGroupNames: classGroupNames.length ? classGroupNames.join(", ") : null,
            },
          });
        }
      }
    }

    if (step === "grading-assessment") {
      const caStructure = asString(data.caStructure);
      const examStructure = asString(data.examStructure);
      const gradeBands = asString(data.gradeBands);
      const passMark = asString(data.passMark);
      const promotionRule = asString(data.promotionRule);
      const groupGradingProfiles = asString(data.groupGradingProfiles);

      if (groupGradingProfiles) {
        try {
          JSON.parse(groupGradingProfiles);
        } catch {
          return NextResponse.json({ error: "Group grading profile payload is invalid JSON." }, { status: 400 });
        }
      }

      const pairs: Array<[string, string]> = [
        ["setup_ca_structure", caStructure],
        ["setup_exam_structure", examStructure],
        ["setup_grade_bands", gradeBands],
        ["setup_pass_mark", passMark],
        ["setup_promotion_rule", promotionRule],
      ];

      for (const [key, value] of pairs) {
        await prisma.schoolSetting.upsert({
          where: { schoolId_key: { schoolId, key } },
          update: { value },
          create: { schoolId, key, value },
        });
      }

      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId, key: "setup_group_grading_profiles" } },
        update: { value: groupGradingProfiles },
        create: { schoolId, key: "setup_group_grading_profiles", value: groupGradingProfiles },
      });
    }

    if (step === "finance-setup") {
      const currentSessionId = asString(data.sessionId);
      const currentTermId = asString(data.termId);
      const groupRows = parseDelimitedRows(data.feeGroups);
      const itemRows = parseDelimitedRows(data.feeItems);

      const groupByName = new Map<string, number>();
      for (const row of groupRows) {
        const name = asString(row[0]);
        const code = asString(row[1]) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const description = asString(row[2]);
        if (!name) continue;

        const group = await prisma.feeGroup.upsert({
          where: { schoolId_name: { schoolId, name } },
          update: { code: code || "general", description: description || null, isActive: true },
          create: { schoolId, name, code: code || "general", description: description || null, isActive: true },
        });
        groupByName.set(name.toLowerCase(), group.id);
      }


      for (const row of itemRows) {
        const groupName = asString(row[0]);
        const name = asString(row[1]);
        const category = asString(row[2]);
        const amount = Number(row[3] ?? 0);
        const className = asString(row[4]);
        const armName = asString(row[5]);
        const sessionName = asString(row[6]);
        const termName = asString(row[7]);
        const isOptional = String(row[8] ?? "false").toLowerCase() === "true";
        const dueDate = asString(row[9]);
        const description = asString(row[10]);
        const sortOrder = Number(row[11] ?? 0);

        const feeGroupId = groupByName.get(groupName.toLowerCase());
        if (!feeGroupId || !name) continue;

        const [classRow, sessionRow] = await Promise.all([
          className ? prisma.class.findFirst({ where: { schoolId, name: className }, select: { id: true } }) : Promise.resolve(null),
          sessionName ? prisma.session.findFirst({ where: { schoolId, name: sessionName }, select: { id: true } }) : Promise.resolve(null),
        ]);

        const sessionId: number | null = sessionRow?.id ?? (currentSessionId ? parseInt(currentSessionId, 10) : null);
        if (!sessionId) continue;

        const termRow = termName
          ? await prisma.term.findFirst({ where: { schoolId, sessionId, name: termName }, select: { id: true } })
          : null;
        const termId: number | null = termRow?.id ?? (currentTermId ? parseInt(currentTermId, 10) : null);
        if (!termId) continue;

        const armRow = armName && classRow
          ? await prisma.classArm.findFirst({ where: { schoolId, classId: classRow.id, name: armName }, select: { id: true } })
          : null;

        const existingFeeItem = await prisma.feeItem.findFirst({ where: { schoolId, feeGroupId, name, sessionId, termId }, select: { id: true } });
        if (existingFeeItem) {
          await prisma.feeItem.update({
            where: { id: existingFeeItem.id },
            data: {
              category: category || groupName,
              amount,
              description: description || null,
              isOptional,
              dueDate: dueDate ? new Date(dueDate) : null,
              sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
              isActive: true,
              classId: classRow?.id ?? null,
              armId: armRow?.id ?? null,
            },
          });
        } else {
          await prisma.feeItem.create({
            data: {
              schoolId,
              feeGroupId,
              category: category || groupName,
              name,
              amount,
              description: description || null,
              isOptional,
              dueDate: dueDate ? new Date(dueDate) : null,
              sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
              isActive: true,
              classId: classRow?.id ?? null,
              armId: armRow?.id ?? null,
              sessionId,
              termId,
            },
          });
        }
      }
    }

    if (step === "users-roles") {
      const teacherRows = parseDelimitedRows(data.teachers);
      const parentRows = parseDelimitedRows(data.parents);
      const studentRows = parseDelimitedRows(data.students);
      const classTeacherRows = parseDelimitedRows(data.classTeachers);
      const subjectTeacherRows = parseDelimitedRows(data.subjectTeachers);

      const [teacherRole, parentRole, studentRole] = await Promise.all([
        prisma.role.findUnique({ where: { name: "TEACHER" } }),
        prisma.role.findUnique({ where: { name: "PARENT" } }),
        prisma.role.findUnique({ where: { name: "STUDENT" } }),
      ]);

      if (!teacherRole || !parentRole || !studentRole) {
        return NextResponse.json({ error: "Required roles are missing." }, { status: 400 });
      }

      const defaultPassword = await bcrypt.hash("password123", 10);

      for (const row of teacherRows) {
        const name = asString(row[0]);
        const email = asString(row[1]).toLowerCase();
        const avatarUrl = asString(row[2]);
        if (!name || !email) continue;

        const user = await prisma.user.upsert({
          where: { email },
          update: { name, schoolId, roleId: teacherRole.id, isActive: true, avatarUrl: avatarUrl || null },
          create: { name, email, schoolId, roleId: teacherRole.id, password: defaultPassword, isActive: true, avatarUrl: avatarUrl || null },
        });

        await prisma.teacher.upsert({
          where: { userId: user.id },
          update: { schoolId },
          create: { schoolId, userId: user.id },
        });
      }

      for (const row of parentRows) {
        const name = asString(row[0]);
        const email = asString(row[1]).toLowerCase();
        const avatarUrl = asString(row[2]);
        if (!name || !email) continue;

        const user = await prisma.user.upsert({
          where: { email },
          update: { name, schoolId, roleId: parentRole.id, isActive: true, avatarUrl: avatarUrl || null },
          create: { name, email, schoolId, roleId: parentRole.id, password: defaultPassword, isActive: true, avatarUrl: avatarUrl || null },
        });

        await prisma.parent.upsert({
          where: { userId: user.id },
          update: { schoolId },
          create: { schoolId, userId: user.id },
        });
      }

      for (const row of studentRows) {
        const name = asString(row[0]);
        const email = asString(row[1]).toLowerCase();
        const className = asString(row[2]);
        const parentEmail = asString(row[3]).toLowerCase();
        const gender = asString(row[4]) || "UNSPECIFIED";
        const ageRaw = Number(row[5] ?? 10);
        const passportUrl = asString(row[6]);
        const age = Number.isFinite(ageRaw) && ageRaw > 0 ? Math.floor(ageRaw) : 10;
        if (!name || !email) continue;

        const parts = name.trim().split(/\s+/);
        const firstName = parts[0] || "Unknown";
        const lastName = parts.length >= 2 ? parts[parts.length - 1] : "Unknown";
        const middleName = parts.length >= 3 ? parts.slice(1, -1).join(" ") : null;

        const [classRow, parentUser] = await Promise.all([
          className ? prisma.class.findFirst({ where: { schoolId, name: className }, select: { id: true } }) : Promise.resolve(null),
          parentEmail ? prisma.user.findUnique({ where: { email: parentEmail }, select: { id: true } }) : Promise.resolve(null),
        ]);

        const parent = parentUser ? await prisma.parent.findFirst({ where: { schoolId, userId: parentUser.id }, select: { id: true } }) : null;

        const user = await prisma.user.upsert({
          where: { email },
          update: { name, schoolId, roleId: studentRole.id, isActive: true },
          create: { name, email, schoolId, roleId: studentRole.id, password: defaultPassword, isActive: true },
        });

        await prisma.student.upsert({
          where: { userId: user.id },
          update: { schoolId, classId: classRow?.id ?? null, parentId: parent?.id ?? null, firstName, middleName, lastName, gender, age, passportUrl: passportUrl || null },
          create: { schoolId, userId: user.id, classId: classRow?.id ?? null, parentId: parent?.id ?? null, firstName, middleName, lastName, gender, age, passportUrl: passportUrl || null },
        });
      }

      for (const row of classTeacherRows) {
        const className = asString(row[0]);
        const teacherEmail = asString(row[1]).toLowerCase();
        if (!className || !teacherEmail) continue;

        const [classRow, teacherUser] = await Promise.all([
          prisma.class.findFirst({ where: { schoolId, name: className }, select: { id: true } }),
          prisma.user.findUnique({ where: { email: teacherEmail }, select: { id: true } }),
        ]);
        if (!classRow || !teacherUser) continue;

        const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: teacherUser.id }, select: { id: true } });
        if (!teacher) continue;

        await prisma.class.update({ where: { id: classRow.id }, data: { teacherId: teacher.id } });
      }

      for (const row of subjectTeacherRows) {
        const subjectName = asString(row[0]);
        const teacherEmail = asString(row[1]).toLowerCase();
        if (!subjectName || !teacherEmail) continue;

        const [subjectRow, teacherUser] = await Promise.all([
          prisma.subject.findFirst({ where: { schoolId, name: subjectName }, select: { id: true } }),
          prisma.user.findUnique({ where: { email: teacherEmail }, select: { id: true } }),
        ]);
        if (!subjectRow || !teacherUser) continue;

        const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: teacherUser.id }, select: { id: true } });
        if (!teacher) continue;

        await prisma.subject.update({ where: { id: subjectRow.id }, data: { teacherId: teacher.id } });
      }
    }

    const setup = await getSetupWizardState(schoolId);
    const nextStatus = {
      ...setup.status,
      lastCompletedStep: setup.status.completedSteps.length,
      completedSteps: setup.status.completedSteps,
      setupCompleted: step === "review-activate" ? setup.status.setupCompleted : false,
      updatedAt: new Date().toISOString(),
    };

    if (step === "review-activate") {
      const activate = Boolean(data.activate === true || String(data.activate).toLowerCase() === "true");
      if (activate && !setup.canActivate) {
        return NextResponse.json({ error: "Minimum setup requirements are not complete yet.", setup }, { status: 400 });
      }
      nextStatus.setupCompleted = activate && setup.canActivate;
    }

    await saveSetupWizardStatus(schoolId, nextStatus);
    const updated = await getSetupWizardState(schoolId);

    return NextResponse.json({ ok: true, setup: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save setup step.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
