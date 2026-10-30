/**
 * Admin Web API Client
 * All requests go through Vite's /api proxy → backend :5000
 */

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('attendance_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    localStorage.removeItem('attendance_token');
    window.location.reload();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.message || err.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv')) {
    return (await res.text()) as unknown as T;
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: { id: number; company_email: string; full_name: string; role: string; status: string };
}

export const authApi = {
  login: (company_email: string, password: string) =>
    request<LoginResponse>('POST', '/auth/login', { company_email, password }),
  me: () => request<{ user: LoginResponse['user'] }>('GET', '/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    request('POST', '/auth/change-password', { current_password, new_password })
};

// ─── QR ──────────────────────────────────────────────────────────────────────
export interface QrCurrentResponse {
  imageDataUrl: string;
  expiresAt: string;
  ttlSeconds: number;
  tokenId: number;
}

export const qrApi = {
  current: () => request<QrCurrentResponse>('GET', '/qr/current'),
  rotate: () => request('POST', '/qr/rotate')
};

// ─── Admin: Employees ────────────────────────────────────────────────────────
export interface Employee {
  id: number;
  company_email: string;
  full_name: string;
  employee_code: string | null;
  role: 'Admin' | 'Employee';
  status: string;
  created_at: string;
}

export interface CreateEmployeePayload {
  company_email: string;
  full_name: string;
  employee_code?: string;
  role?: 'Admin' | 'Employee';
}

export interface CreateEmployeeResponse {
  message: string;
  employee: Employee;
  temporaryPassword: string;
}

export const employeeApi = {
  list: () => request<{ employees: Employee[] }>('GET', '/admin/employees'),
  create: (payload: CreateEmployeePayload) =>
    request<CreateEmployeeResponse>('POST', '/admin/employees', payload)
};

// ─── Admin: Attendance ───────────────────────────────────────────────────────
export interface AttendanceSession {
  id: number;
  user_id: number;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: 'open' | 'completed' | 'incomplete';
  full_name: string;
  company_email: string;
  employee_code: string | null;
  role: string;
}

export const attendanceApi = {
  list: (params?: { from?: string; to?: string; user_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.user_id) qs.set('user_id', String(params.user_id));
    const q = qs.toString();
    return request<{ sessions: AttendanceSession[] }>('GET', `/admin/attendance${q ? `?${q}` : ''}`);
  },
  exportCsvUrl: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString();
    return `/api/admin/reports/export${q ? `?${q}` : ''}`;
  }
};

// ─── Admin: Corrections ──────────────────────────────────────────────────────
export interface CorrectionRequest {
  id: number;
  user_id: number;
  session_id: number | null;
  punch_type: 'check_in' | 'check_out';
  requested_time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decision_reason: string | null;
  reviewed_at: string | null;
  employee_name: string;
  employee_email: string;
  employee_code: string | null;
  reviewer_name: string | null;
  created_at: string;
}

export const correctionApi = {
  listAdmin: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return request<{ corrections: CorrectionRequest[] }>('GET', `/admin/corrections${q}`);
  },
  review: (id: number, decision: 'approved' | 'rejected', decision_reason: string) =>
    request('PATCH', `/admin/corrections/${id}`, { decision, decision_reason }),
  exceptions: () => request<{ exceptions: any[]; summary: any }>('GET', '/admin/attendance/exceptions')
};

// ─── Today Summary ────────────────────────────────────────────────────────────
// Dashboard summary is derived from attendanceApi.list filtered to today.
// Kept here for future server-side summary endpoint.
export const dashboardApi = {
  exceptions: () => request<{ noPunchEmployees: any[]; incompleteSessions: any[]; pendingCorrectionsCount: number; workDate: string }>('GET', '/admin/attendance/exceptions')
};
