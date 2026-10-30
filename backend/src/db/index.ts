import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { config } from '../config';
import { mockStore, UserRecord, AttendanceSessionRecord, AttendanceEventRecord, QrTokenRecord, CorrectionRequestRecord, AuditLogRecord } from './mockStore';

let pool: Pool | null = null;
let isConnectedToMySQL = false;
let lastConnectionError: string | null = null;

// Initialize connection pool if configured
if (config.db.isConfigured) {
  const poolOptions: PoolOptions = {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    waitForConnections: true,
    connectionLimit: config.db.connectionLimit,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  try {
    pool = mysql.createPool(poolOptions);
  } catch (err: any) {
    lastConnectionError = err.message;
    console.warn(`[DB] Failed to create MySQL pool: ${err.message}. Reverting to mock fallback.`);
  }
}

/**
 * Verifies live connection to MySQL.
 * Returns true if reachable, false if fallback mode is active.
 */
export async function verifyConnection(): Promise<boolean> {
  if (!config.db.isConfigured || !pool) {
    isConnectedToMySQL = false;
    return false;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnectedToMySQL = true;
    lastConnectionError = null;
    return true;
  } catch (err: any) {
    isConnectedToMySQL = false;
    lastConnectionError = err.message;
    console.warn(`[DB] MySQL connection check failed: ${err.message}. Backend will use safe mock fallback.`);
    return false;
  }
}

/**
 * Returns current database runtime status and metadata
 */
export function getDatabaseStatus() {
  return {
    isConfigured: config.db.isConfigured,
    isConnected: isConnectedToMySQL,
    mode: isConnectedToMySQL ? 'MySQL (Live Connected)' : 'Mock Fallback Store',
    targetHost: config.db.host,
    targetDatabase: config.db.database,
    targetUser: config.db.isConfigured ? config.db.user : 'placeholder_user',
    lastError: lastConnectionError,
    statusMessage: isConnectedToMySQL
      ? `Successfully connected to MySQL database '${config.db.database}'`
      : config.db.statusMessage
  };
}

// -----------------------------------------------------------------------------
// Unified Data Access Repository (Switches transparently between MySQL and Mock)
// -----------------------------------------------------------------------------

export const dbRepository = {
  // --- USERS ---
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    if (isConnectedToMySQL && pool) {
      const [rows]: any = await pool.query(
        'SELECT * FROM users WHERE company_email = ? LIMIT 1',
        [email.toLowerCase().trim()]
      );
      return rows[0] || null;
    }
    return mockStore.users.find(u => u.company_email.toLowerCase() === email.toLowerCase().trim()) || null;
  },

  async getUserById(id: number): Promise<UserRecord | null> {
    if (isConnectedToMySQL && pool) {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    return mockStore.users.find(u => u.id === id) || null;
  },

  async createUser(data: {
    company_email: string;
    full_name: string;
    employee_code?: string | null;
    role: 'Admin' | 'Employee';
    status: 'active' | 'inactive' | 'pending_password_change';
    password_hash: string;
  }): Promise<UserRecord> {
    const email = data.company_email.toLowerCase().trim();
    if (isConnectedToMySQL && pool) {
      const [result]: any = await pool.query(
        `INSERT INTO users (company_email, full_name, employee_code, role, status, password_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [email, data.full_name, data.employee_code || null, data.role, data.status, data.password_hash]
      );
      const inserted = await this.getUserById(result.insertId);
      return inserted!;
    }

    const newUser: UserRecord = {
      id: mockStore.getNextUserId(),
      company_email: email,
      full_name: data.full_name,
      employee_code: data.employee_code || null,
      role: data.role,
      status: data.status,
      password_hash: data.password_hash,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.users.push(newUser);
    return newUser;
  },

  async updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    if (isConnectedToMySQL && pool) {
      await pool.query(
        'UPDATE users SET password_hash = ?, status = "active", updated_at = NOW() WHERE id = ?',
        [passwordHash, userId]
      );
      return;
    }
    const user = mockStore.users.find(u => u.id === userId);
    if (user) {
      user.password_hash = passwordHash;
      user.status = 'active';
      user.updated_at = new Date();
    }
  },

  // --- ATTENDANCE SESSIONS ---
  async getTodaySession(userId: number, workDate: string): Promise<AttendanceSessionRecord | null> {
    if (isConnectedToMySQL && pool) {
      const [rows]: any = await pool.query(
        'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? LIMIT 1',
        [userId, workDate]
      );
      return rows[0] || null;
    }
    return mockStore.attendanceSessions.find(s => s.user_id === userId && s.work_date === workDate) || null;
  },

  async createSession(data: {
    user_id: number;
    work_date: string;
    check_in_at: Date;
    status: 'open' | 'completed' | 'incomplete';
  }): Promise<AttendanceSessionRecord> {
    if (isConnectedToMySQL && pool) {
      const [result]: any = await pool.query(
        `INSERT INTO attendance_sessions (user_id, work_date, check_in_at, status)
         VALUES (?, ?, ?, ?)`,
        [data.user_id, data.work_date, data.check_in_at, data.status]
      );
      const [rows]: any = await pool.query('SELECT * FROM attendance_sessions WHERE id = ?', [result.insertId]);
      return rows[0];
    }

    const newSession: AttendanceSessionRecord = {
      id: mockStore.getNextSessionId(),
      user_id: data.user_id,
      work_date: data.work_date,
      check_in_at: data.check_in_at,
      check_out_at: null,
      status: data.status,
      created_at: new Date(),
      updated_at: new Date()
    };
    mockStore.attendanceSessions.push(newSession);
    return newSession;
  },

  async updateSessionCheckOut(sessionId: number, checkOutAt: Date): Promise<void> {
    if (isConnectedToMySQL && pool) {
      await pool.query(
        'UPDATE attendance_sessions SET check_out_at = ?, status = "completed", updated_at = NOW() WHERE id = ?',
        [checkOutAt, sessionId]
      );
      return;
    }
    const session = mockStore.attendanceSessions.find(s => s.id === sessionId);
    if (session) {
      session.check_out_at = checkOutAt;
      session.status = 'completed';
      session.updated_at = new Date();
    }
  },

  // --- ATTENDANCE EVENTS ---
  async createAttendanceEvent(data: {
    user_id: number;
    event_type: 'check_in' | 'check_out';
    server_timestamp: Date;
    qr_token_id: number | null;
    source: 'qr_scan' | 'admin_correction';
    idempotency_key?: string | null;
  }): Promise<AttendanceEventRecord> {
    if (isConnectedToMySQL && pool) {
      const [result]: any = await pool.query(
        `INSERT INTO attendance_events (user_id, event_type, server_timestamp, qr_token_id, source, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.user_id, data.event_type, data.server_timestamp, data.qr_token_id, data.source, data.idempotency_key || null]
      );
      const [rows]: any = await pool.query('SELECT * FROM attendance_events WHERE id = ?', [result.insertId]);
      return rows[0];
    }

    const newEvent: AttendanceEventRecord = {
      id: mockStore.getNextEventId(),
      user_id: data.user_id,
      event_type: data.event_type,
      server_timestamp: data.server_timestamp,
      qr_token_id: data.qr_token_id,
      source: data.source,
      idempotency_key: data.idempotency_key || null,
      created_at: new Date()
    };
    mockStore.attendanceEvents.push(newEvent);
    return newEvent;
  },

  // --- QR TOKENS ---
  async createQrToken(tokenHash: string, issuedAt: Date, expiresAt: Date): Promise<QrTokenRecord> {
    if (isConnectedToMySQL && pool) {
      const [result]: any = await pool.query(
        'INSERT INTO qr_tokens (token_hash, issued_at, expires_at, status) VALUES (?, ?, ?, "active")',
        [tokenHash, issuedAt, expiresAt]
      );
      const [rows]: any = await pool.query('SELECT * FROM qr_tokens WHERE id = ?', [result.insertId]);
      return rows[0];
    }

    const tokenRecord: QrTokenRecord = {
      id: mockStore.getNextQrTokenId(),
      token_hash: tokenHash,
      issued_at: issuedAt,
      expires_at: expiresAt,
      used_at: null,
      status: 'active'
    };
    mockStore.qrTokens.push(tokenRecord);
    return tokenRecord;
  },

  async getQrTokenByHash(tokenHash: string): Promise<QrTokenRecord | null> {
    if (isConnectedToMySQL && pool) {
      const [rows]: any = await pool.query('SELECT * FROM qr_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
      return rows[0] || null;
    }
    return mockStore.qrTokens.find(t => t.token_hash === tokenHash) || null;
  },

  async markQrTokenUsed(tokenId: number): Promise<void> {
    if (isConnectedToMySQL && pool) {
      await pool.query('UPDATE qr_tokens SET used_at = NOW(), status = "used" WHERE id = ?', [tokenId]);
      return;
    }
    const token = mockStore.qrTokens.find(t => t.id === tokenId);
    if (token) {
      token.used_at = new Date();
      token.status = 'used';
    }
  },

  // --- AUDIT LOGS ---
  async createAuditLog(data: {
    actor_user_id: number | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    reason?: string | null;
  }): Promise<AuditLogRecord> {
    if (isConnectedToMySQL && pool) {
      const [result]: any = await pool.query(
        `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [data.actor_user_id, data.action, data.entity_type, data.entity_id, data.reason || null]
      );
      const [rows]: any = await pool.query('SELECT * FROM audit_logs WHERE id = ?', [result.insertId]);
      return rows[0];
    }

    const log: AuditLogRecord = {
      id: mockStore.getNextAuditLogId(),
      actor_user_id: data.actor_user_id,
      action: data.action,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      reason: data.reason || null,
      created_at: new Date()
    };
    mockStore.auditLogs.push(log);
    return log;
  }
};

