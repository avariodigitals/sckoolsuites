import { AcademicStatus } from "@/lib/db-types";
import { prisma } from "@/lib/db";

export class AcademicCalendarRepository {
  private toIntId(value: string | number | undefined | null): number | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "number") {
      return Number.isInteger(value) && Number.isFinite(value) ? value : undefined;
    }
    const raw = Number(value);
    return Number.isInteger(raw) && Number.isFinite(raw) ? raw : undefined;
  }

  private requireIntId(value: string | number | undefined | null): number {
    const id = this.toIntId(value);
    if (id === undefined) throw new Error(`Invalid numeric id: ${value}`);
    return id;
  }

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
    return prisma.session.create({ data: data as any });
  }

  async createTerm(data: Record<string, any>) {
    if (data.sessionId !== undefined) {
      data.sessionId = this.requireIntId(data.sessionId);
    }
    return prisma.term.create({ data: data as any });
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

  async setSessionActive(sessionId: string | number) {
    const id = this.requireIntId(sessionId);
    return prisma.session.update({
      where: { id },
      data: { isCurrent: true, status: AcademicStatus.ACTIVE },
    });
  }

  async setTermActive(termId: string | number) {
    const id = this.requireIntId(termId);
    return prisma.term.update({
      where: { id },
      data: { isCurrent: true, status: AcademicStatus.ACTIVE },
    });
  }

  async updateSessionStatus(sessionId: string | number, status: AcademicStatus) {
    const id = this.requireIntId(sessionId);
    return prisma.session.update({
      where: { id },
      data: { status, ...(status === AcademicStatus.CLOSED || status === AcademicStatus.ARCHIVED ? { isCurrent: false } : {}) },
    });
  }

  async updateTermStatus(termId: string | number, status: AcademicStatus) {
    const id = this.requireIntId(termId);
    return prisma.term.update({
      where: { id },
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

    const configuredSessionId = this.toIntId(activeSessionSetting?.value?.trim());
    const configuredTermId = this.toIntId(activeTermSetting?.value?.trim());

    const [configuredSession, configuredTerm] = await Promise.all([
      configuredSessionId !== undefined
        ? prisma.session.findFirst({ where: { id: configuredSessionId, schoolId } })
        : Promise.resolve(null),
      configuredTermId !== undefined
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

  async getTermById(termId: string | number) {
    const id = this.toIntId(termId);
    return id !== undefined ? prisma.term.findUnique({ where: { id } }) : null;
  }

  async getSessionById(sessionId: string | number) {
    const id = this.toIntId(sessionId);
    return id !== undefined ? prisma.session.findUnique({ where: { id } }) : null;
  }
}
