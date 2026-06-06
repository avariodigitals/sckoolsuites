import { AcademicStatus } from "@/lib/db-types";
import { AcademicCalendarRepository } from "@/modules/academic-setup/repositories/academic-calendar.repository";

export class TermLockService {
  constructor(private readonly repository: AcademicCalendarRepository = new AcademicCalendarRepository()) {}

  async ensureTermEditable(termId: string) {
    const term = await this.repository.getTermById(termId);
    if (!term) {
      throw new Error("Term not found.");
    }

    if (term.status === AcademicStatus.CLOSED || term.status === AcademicStatus.ARCHIVED) {
      throw new Error("This term is closed. Results, invoices, attendance, and reports are protected from editing.");
    }

    return term;
  }
}
