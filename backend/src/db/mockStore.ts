/**
 * In-memory fallback data store
 * Active ONLY when MySQL credentials are not yet configured or database is unreachable.
 * Mirrors the exact BRD schema tables and holds seed data.
 */

export interface UserRecord {
  id: number;
  company_email: string;
  full_name: string;
  employee_code: string | null;
  role: 'Admin' | 'Employee';
  status: 'active' | 'inactive' | 'pending_password_change';
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceSessionRecord {
  id: number;
  user_id: number;
  work_date: string; // YYYY-MM-DD
  check_in_at: Date | null;
  check_out_at: Date | null;
  status: 'open' | 'completed' | 'incomplete';
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceEventRecord {
  id: number;
  user_id: number;
  event_type: 'check_in' | 'check_out';
  server_timestamp: Date;
  qr_token_id: number | null;
  source: 'qr_scan' | 'admin_correction';
  idempotency_key: string | null;
  created_at: Date;
}

export interface QrTokenRecord {
  id: number;
  token_hash: string;
  issued_at: Date;
  expires_at: Date;
  used_at: Date | null;
  status: 'active' | 'used' | 'expired';
}

export interface CorrectionRequestRecord {
  id: number;
  user_id: number;
  session_id: number | null;
  punch_type: 'check_in' | 'check_out';
  requested_time: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_at: Date | null;
  decision_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLogRecord {
  id: number;
  actor_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  reason: string | null;
  created_at: Date;
}

class MockStore {
  public users: UserRecord[] = [
    {
      id: 1,
      company_email: 'admin@company.com',
      full_name: 'System Administrator',
      employee_code: 'ADM001',
      role: 'Admin',
      status: 'active',
      password_hash: '$2a$10$u3JuFEBOGMbvd5B5mDrw5.tyiXHcoGkKdp/SlWblOjoMCcy2Wn0NG', // Admin@12345
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      company_email: 'employee@company.com',
      full_name: 'Sample Employee',
      employee_code: 'EMP001',
      role: 'Employee',
      status: 'active',
      password_hash: '$2a$10$vCyYX1dqMjk6EaNwsX7NRe2qry1QQRXNKv7/KH19nGK40cqPNYvVW', // Employee@12345
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  public attendanceSessions: AttendanceSessionRecord[] = [];
  public attendanceEvents: AttendanceEventRecord[] = [];
  public qrTokens: QrTokenRecord[] = [];
  public correctionRequests: CorrectionRequestRecord[] = [];
  public auditLogs: AuditLogRecord[] = [
    {
      id: 1,
      actor_user_id: 1,
      action: 'SYSTEM_INIT',
      entity_type: 'users',
      entity_id: 1,
      reason: 'Mock fallback store initialized with default accounts',
      created_at: new Date()
    }
  ];

  private nextUserId = 3;
  private nextSessionId = 1;
  private nextEventId = 1;
  private nextQrTokenId = 1;
  private nextCorrectionId = 1;
  private nextAuditLogId = 2;

  public getNextUserId(): number {
    return this.nextUserId++;
  }

  public getNextSessionId(): number {
    return this.nextSessionId++;
  }

  public getNextEventId(): number {
    return this.nextEventId++;
  }

  public getNextQrTokenId(): number {
    return this.nextQrTokenId++;
  }

  public getNextCorrectionId(): number {
    return this.nextCorrectionId++;
  }

  public getNextAuditLogId(): number {
    return this.nextAuditLogId++;
  }
}

export const mockStore = new MockStore();
