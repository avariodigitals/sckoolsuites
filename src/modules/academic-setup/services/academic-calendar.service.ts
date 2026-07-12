import { AcademicStatus } from "@/lib/db-types";
import { AcademicCalendarRepository } from "@/modules/academic-setup/repositories/academic-calendar.repository";

type CreateSessionInput = {
  schoolId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: AcademicStatus;
};

type CreateTermInput = {
  schoolId: string;
  sessionId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  resumptionDate?: string;
  breakDates?: string[];
  status?: AcademicStatus;
};

export class AcademicCalendarService {
  constructor(private readonly repository: AcademicCalendarRepository = new AcademicCalendarRepository()) {}

  async getAcademicSetup(schoolId: string) {
    return this.repository.getSchoolAcademicSetup(schoolId);
  }

  async createSession(input: CreateSessionInput) {
    return this.repository.createSession({
      schoolId: input.schoolId,
      name: input.name,
      status: input.status ?? AcademicStatus.DRAFT,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });
  }

  async createTerm(input: CreateTermInput) {
    return this.repository.createTerm({
      schoolId: input.schoolId,
      sessionId: input.sessionId,
      name: input.name,
      status: input.status ?? AcademicStatus.DRAFT,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      resumptionDate: input.resumptionDate ? new Date(input.resumptionDate) : undefined,
      breakDates: input.breakDates,
    });
  }

  async activateSession(schoolId: string, sessionId: string) {
    await this.repository.clearCurrentSession(schoolId);
    const session = await this.repository.setSessionActive(sessionId);
    await this.repository.updateSchoolSetting(schoolId, "active_session_id", String(session.id));
    return session;
  }

  async activateTerm(schoolId: string, termId: string) {
    await this.repository.clearCurrentTerm(schoolId);
    const term = await this.repository.setTermActive(termId);
    await this.repository.updateSchoolSetting(schoolId, "active_term_id", String(term.id));
    return term;
  }

  async updateSessionStatus(schoolId: string, sessionId: string, status: AcademicStatus) {
    if (status === AcademicStatus.ACTIVE) {
      return this.activateSession(schoolId, sessionId);
    }

    const updated = await this.repository.updateSessionStatus(sessionId, status);
    if (status === AcademicStatus.CLOSED || status === AcademicStatus.ARCHIVED) {
      await this.repository.updateSchoolSetting(schoolId, "active_session_id", "");
    }
    return updated;
  }

  async updateTermStatus(schoolId: string, termId: string, status: AcademicStatus) {
    if (status === AcademicStatus.ACTIVE) {
      return this.activateTerm(schoolId, termId);
    }

    const updated = await this.repository.updateTermStatus(termId, status);
    if (status === AcademicStatus.CLOSED || status === AcademicStatus.ARCHIVED) {
      await this.repository.updateSchoolSetting(schoolId, "active_term_id", "");
    }
    return updated;
  }

  async setUserContext(schoolId: string, userId: string | number, sessionId?: string | number, termId?: string | number) {
    await this.repository.updateSchoolSetting(schoolId, `user_context_session_${userId}`, String(sessionId ?? ""));
    await this.repository.updateSchoolSetting(schoolId, `user_context_term_${userId}`, String(termId ?? ""));
  }

  async getUserContext(schoolId: string, userId: string | number) {
    const [sessionSetting, termSetting, current] = await Promise.all([
      this.repository.getSchoolSetting(schoolId, `user_context_session_${userId}`),
      this.repository.getSchoolSetting(schoolId, `user_context_term_${userId}`),
      this.repository.getCurrentSessionTerm(schoolId),
    ]);

    const selectedSessionId = sessionSetting?.value || current.session?.id || null;
    const selectedTermId = termSetting?.value || current.term?.id || null;

    const [selectedSession, selectedTerm] = await Promise.all([
      selectedSessionId ? this.repository.getSessionById(selectedSessionId) : Promise.resolve(null),
      selectedTermId ? this.repository.getTermById(selectedTermId) : Promise.resolve(null),
    ]);

    return {
      session: selectedSession,
      term: selectedTerm,
      sessionId: selectedSession?.id ?? null,
      termId: selectedTerm?.id ?? null,
    };
  }
}
