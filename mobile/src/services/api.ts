/**
 * API Service for React Native Mobile Client
 * Connects to the single unified Express backend
 */

/**
 * Dynamically resolves the API base URL:
 * On physical devices connected via Expo Go, automatically extracts the host computer's
 * LAN IP address from the Metro bundle scriptURL (or defaults to the local Wi-Fi IP).
 */
function resolveInitialApiUrl(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules } = require('react-native');
    const scriptUrl = NativeModules?.SourceCode?.scriptURL;
    if (scriptUrl && typeof scriptUrl === 'string') {
      const match = scriptUrl.match(/https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return `http://${match[1]}:5000/api`;
      }
    }
  } catch {
    // In Node test environment or native modules unavailable
  }

  // Fallback to local Wi-Fi LAN IP (or localhost if not in network)
  return 'http://192.168.1.49:5000/api';
}

let apiBaseUrl = resolveInitialApiUrl();
let authToken: string | null = null;

export function setApiBaseUrl(url: string) {
  apiBaseUrl = url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${apiBaseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || data.error || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export interface UserProfile {
  id: number;
  company_email: string;
  full_name: string;
  employee_code: string | null;
  role: 'Admin' | 'Employee';
  status: string;
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export interface AttendanceTodaySession {
  workDate: string;
  hasSession: boolean;
  status: 'not_started' | 'open' | 'completed' | 'incomplete';
  checkInAt: string | null;
  checkOutAt: string | null;
}

export interface AttendanceHistoryItem {
  id: number;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: 'open' | 'completed' | 'incomplete';
}

export interface MyAttendanceResponse {
  today: AttendanceTodaySession;
  history: AttendanceHistoryItem[];
  officeTimezone: string;
}

export interface ScanResponse {
  success: boolean;
  action: 'check_in' | 'check_out';
  sessionId: number;
  eventId?: number;
  workDate: string;
  serverTimestamp: string;
  formattedTime: string;
  status: 'open' | 'completed';
  message: string;
}

export interface CorrectionItem {
  id: number;
  session_id: number | null;
  punch_type: 'check_in' | 'check_out';
  requested_time: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decision_reason: string | null;
  created_at: string;
}

export const api = {
  async login(company_email: string, password: string): Promise<LoginResponse> {
    const res = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ company_email, password })
    });
    setAuthToken(res.token);
    return res;
  },

  async changePassword(newPassword: string, currentPassword?: string): Promise<{ message: string; mustChangePassword: boolean }> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, currentPassword })
    });
  },

  async getMe(): Promise<{ user: UserProfile }> {
    return request('/me', { method: 'GET' });
  },

  async scanAttendance(token: string, idempotencyKey?: string): Promise<ScanResponse> {
    return request('/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ token, idempotency_key: idempotencyKey })
    });
  },

  async getMyAttendance(): Promise<MyAttendanceResponse> {
    return request('/attendance/me', { method: 'GET' });
  },

  async submitCorrection(data: {
    punch_type: 'check_in' | 'check_out';
    requested_time: string;
    reason: string;
    session_id?: number | null;
  }): Promise<{ message: string; correction: CorrectionItem }> {
    return request('/corrections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMyCorrections(): Promise<{ corrections: CorrectionItem[] }> {
    return request('/corrections/me', { method: 'GET' });
  }
};

