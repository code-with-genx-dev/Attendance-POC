import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import AppShell from './components/layout/AppShell';
import Dashboard from './components/dashboard/Dashboard';
import AttendanceTable from './components/attendance/AttendanceTable';
import CorrectionReviewList from './components/corrections/CorrectionReviewList';
import QrDisplay from './components/qr/QrDisplay';
import OfficeQrDisplay from './components/qr/OfficeQrDisplay';
import EmployeeList from './components/employees/EmployeeList';
import ProfilePage from './components/profile/ProfilePage';

interface User {
  id: number;
  company_email: string;
  full_name: string;
  role: string;
  status: string;
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('attendance_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function UnderConstruction({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#172554] mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoutes() {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep user in localStorage for page reloads
  useEffect(() => {
    if (user) localStorage.setItem('attendance_user', JSON.stringify(user));
    else localStorage.removeItem('attendance_user');
  }, [user]);

  // Check if user is authenticated
  const token = localStorage.getItem('attendance_token');
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  function handleLogout() {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    setUser(null);
    navigate('/login');
  }

  // Map URL path to view ID for AppShell
  const pathToView = (path: string) => {
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path.startsWith('/attendance')) return 'attendance';
    if (path.startsWith('/corrections')) return 'corrections';
    if (path.startsWith('/qr')) return 'qr-display';
    if (path.startsWith('/employees')) return 'employees';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/timesheet')) return 'timesheet';
    if (path.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeView = pathToView(location.pathname);

  return (
    <AppShell
      user={user}
      activeView={activeView}
      onLogout={handleLogout}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<AttendanceTable />} />
        <Route path="/corrections" element={<CorrectionReviewList />} />
        <Route path="/qr" element={<QrDisplay />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/timesheet" element={<UnderConstruction title="Timesheet" description="Employee timesheet management and approval workflow" />} />
        <Route path="/settings" element={<UnderConstruction title="Settings" description="System configuration and preferences" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const [token] = useState<string | null>(() => localStorage.getItem('attendance_token'));
  const [user] = useState<User | null>(getStoredUser);

  function handleLogin(newToken: string, newUser: User) {
    localStorage.setItem('attendance_token', newToken);
    localStorage.setItem('attendance_user', JSON.stringify(newUser));
    window.location.href = '/dashboard';
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          token && user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />
        } />
        <Route path="/office-qr" element={<OfficeQrDisplay />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
