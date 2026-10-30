import { dbRepository } from '../db';
import { config } from '../config';
import { getOfficeWorkDate } from '../controllers/attendance.controller';

export interface AttendanceExceptionsSummary {
  workDate: string;
  officeTimezone: string;
  currentOfficeHour: number;
  reviewCutoffHour: number;
  isCutoffPassed: boolean;
  noPunchEmployees: Array<{
    id: number;
    full_name: string;
    company_email: string;
    employee_code: string | null;
    status: string;
  }>;
  incompleteSessions: Array<{
    id: number;
    user_id: number;
    employee_name?: string;
    employee_email?: string;
    work_date: string;
    check_in_at: Date | null;
    check_out_at: Date | null;
    status: string;
  }>;
  pendingCorrectionsCount: number;
}

export class MissingPunchService {
  /**
   * Scans for unclosed sessions from past dates and marks them 'incomplete'
   * Strictly adheres to BRD rule: Never invent a timestamp; flag as incomplete.
   */
  public async flagIncompleteSessions(): Promise<number> {
    const today = getOfficeWorkDate();
    const activeEmployees = await dbRepository.getAllActiveEmployees();
    let updatedCount = 0;

    for (const emp of activeEmployees) {
      const openSession = await dbRepository.getOpenSessionByUser(emp.id);
      if (openSession && openSession.work_date < today) {
        await dbRepository.markSessionIncomplete(openSession.id);
        await dbRepository.createAuditLog({
          actor_user_id: null,
          action: 'SESSION_MARKED_INCOMPLETE',
          entity_type: 'attendance_sessions',
          entity_id: openSession.id,
          reason: `Session from ${openSession.work_date} remained open past workday cutoff. Marked incomplete without guessing punch time.`
        });
        updatedCount++;
      }
    }
    return updatedCount;
  }

  /**
   * Computes current exceptions: 'No Punch' (after cutoff) and 'Incomplete' sessions
   */
  public async getExceptionsSummary(customDate?: string): Promise<AttendanceExceptionsSummary> {
    const now = new Date();
    const today = customDate || getOfficeWorkDate(now);

    // Get current hour in office timezone
    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: config.attendance.timezone,
      hour: 'numeric',
      hour12: false
    });
    const currentHour = parseInt(hourFormatter.format(now), 10);
    const isCutoffPassed = currentHour >= config.attendance.workdayReviewCutoffHour;

    // First ensure past unclosed sessions are marked incomplete
    await this.flagIncompleteSessions();

    const activeEmployees = await dbRepository.getAllActiveEmployees();
    const todaySessions = await dbRepository.getAllSessionsByDate(today);

    // Identify employees with zero check-in sessions today
    const noPunchEmployees: AttendanceExceptionsSummary['noPunchEmployees'] = [];
    if (isCutoffPassed) {
      const checkedInUserIds = new Set(todaySessions.map(s => s.user_id));
      for (const emp of activeEmployees) {
        if (!checkedInUserIds.has(emp.id) && emp.role === 'Employee') {
          noPunchEmployees.push({
            id: emp.id,
            full_name: emp.full_name,
            company_email: emp.company_email,
            employee_code: emp.employee_code,
            status: 'no_punch'
          });
        }
      }
    }

    // Incomplete sessions (past days incomplete or today past workday end hour)
    const incompleteSessions: AttendanceExceptionsSummary['incompleteSessions'] = [];
    for (const session of todaySessions) {
      if (session.status === 'incomplete' || (session.status === 'open' && currentHour >= config.attendance.workdayEndHour)) {
        const emp = activeEmployees.find(u => u.id === session.user_id);
        incompleteSessions.push({
          id: session.id,
          user_id: session.user_id,
          employee_name: emp?.full_name,
          employee_email: emp?.company_email,
          work_date: session.work_date,
          check_in_at: session.check_in_at,
          check_out_at: session.check_out_at,
          status: 'incomplete'
        });
      }
    }

    const pendingCorrections = await dbRepository.getCorrections({ status: 'pending' });

    return {
      workDate: today,
      officeTimezone: config.attendance.timezone,
      currentOfficeHour: currentHour,
      reviewCutoffHour: config.attendance.workdayReviewCutoffHour,
      isCutoffPassed,
      noPunchEmployees,
      incompleteSessions,
      pendingCorrectionsCount: pendingCorrections.length
    };
  }
}

export const missingPunchService = new MissingPunchService();

