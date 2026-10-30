import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { dbRepository } from '../db';
import { hashPassword, generateTemporaryPassword } from '../utils/auth';
import { config } from '../config';

/**
 * List all employees (Admin only)
 */
export async function listEmployees(req: AuthenticatedRequest, res: Response): Promise<void> {
  const employees = await dbRepository.getAllActiveEmployees();
  res.json({
    employees: employees.map(u => ({
      id: u.id,
      company_email: u.company_email,
      full_name: u.full_name,
      employee_code: u.employee_code,
      role: u.role,
      status: u.status,
      created_at: u.created_at
    }))
  });
}

/**
 * Create new employee account (Admin only)
 * Strictly limited to BRD-approved fields: company_email, full_name, role, employee_code
 */
export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<void> {
  const admin = req.user!;
  const { company_email, full_name, employee_code, role } = req.body;

  if (!company_email || typeof company_email !== 'string' || !company_email.includes('@')) {
    res.status(400).json({ error: 'Bad Request', message: 'Valid company_email is required.' });
    return;
  }

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    res.status(400).json({ error: 'Bad Request', message: 'full_name (minimum 2 characters) is required.' });
    return;
  }

  const assignedRole: 'Admin' | 'Employee' = role === 'Admin' ? 'Admin' : 'Employee';

  const existing = await dbRepository.getUserByEmail(company_email);
  if (existing) {
    res.status(409).json({ error: 'Conflict', message: 'An account with this email already exists.' });
    return;
  }

  const temporaryPassword = generateTemporaryPassword(10);
  const passwordHash = await hashPassword(temporaryPassword);

  const newUser = await dbRepository.createUser({
    company_email: company_email.toLowerCase().trim(),
    full_name: full_name.trim(),
    employee_code: employee_code?.trim() || null,
    role: assignedRole,
    status: 'pending_password_change',
    password_hash: passwordHash
  });

  await dbRepository.createAuditLog({
    actor_user_id: admin.id,
    action: 'EMPLOYEE_CREATED',
    entity_type: 'users',
    entity_id: newUser.id,
    reason: `New ${assignedRole} account created by Admin`
  });

  res.status(201).json({
    message: 'Employee account created. Share the temporary password securely.',
    employee: {
      id: newUser.id,
      company_email: newUser.company_email,
      full_name: newUser.full_name,
      employee_code: newUser.employee_code,
      role: newUser.role,
      status: newUser.status
    },
    temporaryPassword
  });
}

/**
 * Get all attendance records with optional filters (Admin only)
 */
export async function getAdminAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { from, to, user_id } = req.query;

  const fromDate = typeof from === 'string' ? from : undefined;
  const toDate = typeof to === 'string' ? to : undefined;
  const filterUserId = typeof user_id === 'string' ? parseInt(user_id, 10) : undefined;

  const sessions = await dbRepository.getAllSessionsWithEmployees(fromDate, toDate, filterUserId);

  res.json({ sessions });
}

/**
 * Export filtered attendance as CSV (Admin only)
 */
export async function exportAttendanceCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { from, to, user_id } = req.query;

  const fromDate = typeof from === 'string' ? from : undefined;
  const toDate = typeof to === 'string' ? to : undefined;
  const filterUserId = typeof user_id === 'string' ? parseInt(user_id, 10) : undefined;

  const sessions = await dbRepository.getAllSessionsWithEmployees(fromDate, toDate, filterUserId);

  const formatTime = (d: any): string => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString('en-IN', { timeZone: config.attendance.timezone });
    } catch {
      return String(d);
    }
  };

  const rows: string[] = [
    'Employee Name,Employee Code,Company Email,Work Date,Check-In,Check-Out,Status'
  ];

  for (const s of sessions) {
    const col = (v: any) => (v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`);
    rows.push(
      [
        col(s.full_name),
        col(s.employee_code),
        col(s.company_email),
        col(s.work_date),
        col(formatTime(s.check_in_at)),
        col(formatTime(s.check_out_at)),
        col(s.status)
      ].join(',')
    );
  }

  const csv = rows.join('\r\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
  res.send(csv);
}
