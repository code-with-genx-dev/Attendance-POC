import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { config } from '../config';

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
  work_date: string;
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

let pool: Pool;
let isConnectedToMySQL = false;
let lastConnectionError: string | null = null;

// Validate database configuration
if (!config.db.isConfigured) {
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║ ❌ CRITICAL ERROR: DATABASE NOT CONFIGURED                    ║');
  console.error('╠═══════════════════════════════════════════════════════════════╣');
  console.error('║ MySQL database credentials are missing or invalid.           ║');
  console.error('║ Please configure the following in your .env file:             ║');
  console.error('║   - DB_HOST=localhost                                         ║');
  console.error('║   - DB_PORT=3306                                              ║');
  console.error('║   - DB_NAME=attendance_poc_db                                 ║');
  console.error('║   - DB_USER=root                                              ║');
  console.error('║   - DB_PASSWORD=<your_password>                               ║');
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

// Initialize connection pool
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
  console.log(`📊 MySQL connection pool created for database '${config.db.database}'`);
} catch (err: any) {
  lastConnectionError = err.message;
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║ ❌ CRITICAL ERROR: MYSQL POOL CREATION FAILED                 ║');
  console.error('╠═══════════════════════════════════════════════════════════════╣');
  console.error(`║ Error: ${err.message.padEnd(57)}║`);
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  process.exit(1);
}

/**
 * Verifies live connection to MySQL database
 * Returns true if connected, exits process if connection fails
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    console.log('🔌 Attempting MySQL database connection...');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isConnectedToMySQL = true;
    lastConnectionError = null;
    
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ DATABASE CONNECTION SUCCESSFUL                             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Host:     ${config.db.host.padEnd(51)}║`);
    console.log(`║ Port:     ${String(config.db.port).padEnd(51)}║`);
    console.log(`║ Database: ${config.db.database.padEnd(51)}║`);
    console.log(`║ User:     ${config.db.user.padEnd(51)}║`);
    console.log(`║ Status:   Connected and ready                                ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    return true;
  } catch (err: any) {
    isConnectedToMySQL = false;
    lastConnectionError = err.message;
    
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║ ❌ DATABASE CONNECTION FAILED                                 ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║ Host:     ${config.db.host.padEnd(51)}║`);
    console.error(`║ Port:     ${String(config.db.port).padEnd(51)}║`);
    console.error(`║ Database: ${config.db.database.padEnd(51)}║`);
    console.error(`║ User:     ${config.db.user.padEnd(51)}║`);
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║ Error Code: ${err.code?.padEnd(47)}║`);
    console.error(`║ Error: ${err.message.substring(0, 54).padEnd(57)}║`);
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error('║ Possible Solutions:                                           ║');
    console.error('║ 1. Verify MySQL service is running                           ║');
    console.error('║ 2. Check database credentials in .env file                   ║');
    console.error('║ 3. Ensure database exists: attendance_poc_db                 ║');
    console.error('║ 4. Run: mysql -u root < database/schema.sql                  ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    
    process.exit(1);
  }
}

/**
 * Returns current database runtime status
 */
export function getDatabaseStatus() {
  return {
    isConfigured: true,
    isConnected: isConnectedToMySQL,
    mode: 'MySQL (Live Database)',
    targetHost: config.db.host,
    targetDatabase: config.db.database,
    targetUser: config.db.user,
    lastError: lastConnectionError,
    statusMessage: isConnectedToMySQL
      ? `✅ Connected to MySQL database '${config.db.database}'`
      : `❌ Database connection failed: ${lastConnectionError || 'Unknown error'}`
  };
}

// -----------------------------------------------------------------------------
// Database Repository - All operations use real MySQL database
// -----------------------------------------------------------------------------

export const dbRepository = {
  // --- USERS ---
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE company_email = ? LIMIT 1',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  async getUserById(id: number): Promise<UserRecord | null> {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
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
    const [result]: any = await pool.query(
      `INSERT INTO users (company_email, full_name, employee_code, role, status, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, data.full_name, data.employee_code || null, data.role, data.status, data.password_hash]
    );
    const inserted = await this.getUserById(result.insertId);
    if (!inserted) throw new Error('Failed to create user');
    return inserted;
  },

  async updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    await pool.query(
      'UPDATE users SET password_hash = ?, status = "active", updated_at = NOW() WHERE id = ?',
      [passwordHash, userId]
    );
  },

  async updateUserName(userId: number, fullName: string): Promise<void> {
    await pool.query(
      'UPDATE users SET full_name = ?, updated_at = NOW() WHERE id = ?',
      [fullName, userId]
    );
  },

  // --- ATTENDANCE SESSIONS ---
  async getTodaySession(userId: number, workDate: string): Promise<AttendanceSessionRecord | null> {
    const [rows]: any = await pool.query(
      'SELECT * FROM attendance_sessions WHERE user_id = ? AND work_date = ? ORDER BY id DESC LIMIT 1',
      [userId, workDate]
    );
    return rows[0] || null;
  },

  async getOpenSessionByUser(userId: number): Promise<AttendanceSessionRecord | null> {
    const [rows]: any = await pool.query(
      'SELECT * FROM attendance_sessions WHERE user_id = ? AND status = "open" ORDER BY id DESC LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  },

  async getSessionsByUser(userId: number, fromDate?: string, toDate?: string): Promise<AttendanceSessionRecord[]> {
    let sql = 'SELECT * FROM attendance_sessions WHERE user_id = ?';
    const params: any[] = [userId];

    if (fromDate) {
      sql += ' AND work_date >= ?';
      params.push(fromDate);
    }
    if (toDate) {
      sql += ' AND work_date <= ?';
      params.push(toDate);
    }
    sql += ' ORDER BY work_date DESC, id DESC';

    const [rows]: any = await pool.query(sql, params);
    return rows;
  },

  async createSession(data: {
    user_id: number;
    work_date: string;
    check_in_at: Date;
    status: 'open' | 'completed' | 'incomplete';
  }): Promise<AttendanceSessionRecord> {
    const [result]: any = await pool.query(
      `INSERT INTO attendance_sessions (user_id, work_date, check_in_at, status)
       VALUES (?, ?, ?, ?)`,
      [data.user_id, data.work_date, data.check_in_at, data.status]
    );
    const [rows]: any = await pool.query('SELECT * FROM attendance_sessions WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async updateSessionCheckOut(sessionId: number, checkOutAt: Date): Promise<void> {
    await pool.query(
      'UPDATE attendance_sessions SET check_out_at = ?, status = "completed", updated_at = NOW() WHERE id = ?',
      [checkOutAt, sessionId]
    );
  },

  async getSessionById(sessionId: number): Promise<AttendanceSessionRecord | null> {
    const [rows]: any = await pool.query('SELECT * FROM attendance_sessions WHERE id = ? LIMIT 1', [sessionId]);
    return rows[0] || null;
  },

  async updateSessionCheckIn(sessionId: number, checkInAt: Date): Promise<void> {
    await pool.query(
      'UPDATE attendance_sessions SET check_in_at = ?, updated_at = NOW() WHERE id = ?',
      [checkInAt, sessionId]
    );
  },

  async markSessionIncomplete(sessionId: number): Promise<void> {
    await pool.query(
      'UPDATE attendance_sessions SET status = "incomplete", updated_at = NOW() WHERE id = ?',
      [sessionId]
    );
  },

  async getAllSessionsByDate(workDate: string): Promise<AttendanceSessionRecord[]> {
    const [rows]: any = await pool.query(
      'SELECT * FROM attendance_sessions WHERE work_date = ?',
      [workDate]
    );
    return rows;
  },

  async getAllActiveEmployees(): Promise<UserRecord[]> {
    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE status != "inactive" ORDER BY full_name ASC'
    );
    return rows;
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
    const [result]: any = await pool.query(
      `INSERT INTO attendance_events (user_id, event_type, server_timestamp, qr_token_id, source, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.user_id, data.event_type, data.server_timestamp, data.qr_token_id, data.source, data.idempotency_key || null]
    );
    const [rows]: any = await pool.query('SELECT * FROM attendance_events WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async getAttendanceEventByIdempotency(idempotencyKey: string): Promise<AttendanceEventRecord | null> {
    const [rows]: any = await pool.query(
      'SELECT * FROM attendance_events WHERE idempotency_key = ? LIMIT 1',
      [idempotencyKey]
    );
    return rows[0] || null;
  },

  // --- QR TOKENS ---
  async createQrToken(tokenHash: string, issuedAt: Date, expiresAt: Date): Promise<QrTokenRecord> {
    const [result]: any = await pool.query(
      'INSERT INTO qr_tokens (token_hash, issued_at, expires_at, status) VALUES (?, ?, ?, "active")',
      [tokenHash, issuedAt, expiresAt]
    );
    const [rows]: any = await pool.query('SELECT * FROM qr_tokens WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async getQrTokenByHash(tokenHash: string): Promise<QrTokenRecord | null> {
    const [rows]: any = await pool.query('SELECT * FROM qr_tokens WHERE token_hash = ? LIMIT 1', [tokenHash]);
    return rows[0] || null;
  },

  async markQrTokenUsed(tokenId: number): Promise<void> {
    await pool.query('UPDATE qr_tokens SET used_at = NOW(), status = "used" WHERE id = ?', [tokenId]);
  },

  // --- CORRECTION REQUESTS ---
  async createCorrectionRequest(data: {
    user_id: number;
    session_id?: number | null;
    punch_type: 'check_in' | 'check_out';
    requested_time: Date;
    reason: string;
  }): Promise<CorrectionRequestRecord> {
    const [result]: any = await pool.query(
      `INSERT INTO correction_requests (user_id, session_id, punch_type, requested_time, reason, status)
       VALUES (?, ?, ?, ?, ?, "pending")`,
      [data.user_id, data.session_id || null, data.punch_type, data.requested_time, data.reason]
    );
    const [rows]: any = await pool.query('SELECT * FROM correction_requests WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  async getCorrectionById(id: number): Promise<CorrectionRequestRecord | null> {
    const [rows]: any = await pool.query('SELECT * FROM correction_requests WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async getCorrections(filter?: { status?: string; user_id?: number }): Promise<any[]> {
    let sql = `
      SELECT c.*, u.full_name AS employee_name, u.company_email AS employee_email, u.employee_code,
             r.full_name AS reviewer_name
      FROM correction_requests c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users r ON c.reviewed_by = r.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filter?.status) {
      sql += ' AND c.status = ?';
      params.push(filter.status);
    }
    if (filter?.user_id) {
      sql += ' AND c.user_id = ?';
      params.push(filter.user_id);
    }
    sql += ' ORDER BY c.created_at DESC';
    const [rows]: any = await pool.query(sql, params);
    return rows;
  },

  async reviewCorrection(id: number, data: {
    status: 'approved' | 'rejected';
    reviewed_by: number;
    decision_reason: string;
  }): Promise<CorrectionRequestRecord | null> {
    await pool.query(
      `UPDATE correction_requests
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), decision_reason = ?, updated_at = NOW()
       WHERE id = ?`,
      [data.status, data.reviewed_by, data.decision_reason, id]
    );
    return this.getCorrectionById(id);
  },

  // --- AUDIT LOGS ---
  async createAuditLog(data: {
    actor_user_id: number | null;
    action: string;
    entity_type: string;
    entity_id: number | null;
    reason?: string | null;
  }): Promise<AuditLogRecord> {
    const [result]: any = await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [data.actor_user_id, data.action, data.entity_type, data.entity_id, data.reason || null]
    );
    const [rows]: any = await pool.query('SELECT * FROM audit_logs WHERE id = ?', [result.insertId]);
    return rows[0];
  },

  /**
   * Admin-facing joined attendance session list with employee info
   */
  async getAllSessionsWithEmployees(
    fromDate?: string,
    toDate?: string,
    userId?: number
  ): Promise<any[]> {
    let sql = `
      SELECT s.*, u.full_name, u.company_email, u.employee_code, u.role
      FROM attendance_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (fromDate) { sql += ' AND s.work_date >= ?'; params.push(fromDate); }
    if (toDate) { sql += ' AND s.work_date <= ?'; params.push(toDate); }
    if (userId) { sql += ' AND s.user_id = ?'; params.push(userId); }
    sql += ' ORDER BY s.work_date DESC, u.full_name ASC';
    const [rows]: any = await pool.query(sql, params);
    return rows;
  }
};

