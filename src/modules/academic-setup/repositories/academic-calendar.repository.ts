import { AcademicStatus } from "@/lib/db-types";
import { prisma } from "@/lib/db";

export class AcademicCalendarRepository {
  async getSchoolAcademicSetup(schoolId: string) {
    const [sessions, terms] = await Promise.all([
      prisma.session.findMany({
        where: { schoolId },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.term.findMany({
        where: { schoolId },
        include: { session: true },
        orderBy: [{ createdAt: "desc" }],
      }),
    ]);

    return { sessions, terms };
  }

  async createSession(data: Record<string, any>) {
    return prisma.session.create({ data });
  }

  async createTerm(data: Record<string, any>) {
    return prisma.term.create({ data });
  }

  async clearCurrentSession(schoolId: string) {
    return prisma.session.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  async clearCurrentTerm(schoolId: string) {
    return prisma.term.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  async setSessionActive(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { isCurrent: true, status: AcademicStatus.ACTIVE },
    });
  }

  async setTermActive(termId: string) {
    return prisma.term.update({
      where: { id: termId },
      data: { isCurrent: true, status: AcademicStatus.ACTIVE },
    });
  }

  async updateSessionStatus(sessionId: string, status: AcademicStatus) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { status, ...(status === AcademicStatus.CLOSED || status === AcademicStatus.ARCHIVED ? { isCurrent: false } : {}) },
    });
  }

  async updateTermStatus(termId: string, status: AcademicStatus) {
    return prisma.term.update({
      where: { id: termId },
      data: { status, ...(status === AcademicStatus.CLOSED || status === AcademicStatus.ARCHIVED ? { isCurrent: false } : {}) },
    });
  }

  async updateSchoolSetting(schoolId: string, key: string, value: string) {
    return prisma.schoolSetting.upsert({
      where: { schoolId_key: { schoolId, key } },
      update: { value },
      create: { schoolId, key, value },
    });
  }

  async getSchoolSetting(schoolId: string, key: string) {
    return prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });
  }

  async getCurrentSessionTerm(schoolId: string) {
    const [activeSessionSetting, activeTermSetting] = await Promise.all([
      this.getSchoolSetting(schoolId, "active_session_id"),
      this.getSchoolSetting(schoolId, "active_term_id"),
    ]);

    const configuredSessionId = activeSessionSetting?.value?.trim();
    const configuredTermId = activeTermSetting?.value?.trim();

    const [configuredSession, configuredTerm] = await Promise.all([
      configuredSessionId
        ? prisma.session.findFirst({ where: { id: configuredSessionId, schoolId } })
        : Promise.resolve(null),
      configuredTermId
        ? prisma.term.findFirst({ where: { id: configuredTermId, schoolId }, include: { session: true } })
        : Promise.resolve(null),
    ]);

    if (configuredSession || configuredTerm) {
      return { session: configuredSession, term: configuredTerm };
    }

    const [session, term] = await Promise.all([
      prisma.session.findFirst({ where: { schoolId, isCurrent: true } }),
      prisma.term.findFirst({ where: { schoolId, isCurrent: true }, include: { session: true } }),
    ]);

    return { session, term };
  }

  async getTermById(termId: string) {
    return prisma.term.findUnique({ where: { id: termId } });
  }

  async getSessionById(sessionId: string) {
    return prisma.session.findUnique({ where: { id: sessionId } });
  }
}
