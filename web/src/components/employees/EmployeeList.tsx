import { useEffect, useState } from 'react';
import { employeeApi, Employee } from '../../services/api';
import OnboardingModal from './OnboardingModal';

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'Admin'
    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
    : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${cls}`}>{role}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    pending_password_change: 'bg-amber-100 text-amber-700 border-amber-200',
    inactive: 'bg-gray-100 text-gray-500 border-gray-200'
  };
  const label: Record<string, string> = {
    active: 'Active',
    pending_password_change: 'Pending Setup',
    inactive: 'Inactive'
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${map[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {label[status] || status}
    </span>
  );
}

interface TempCredential {
  employee: Employee;
  tempPassword: string;
}

export default function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newCred, setNewCred] = useState<TempCredential | null>(null);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await employeeApi.list();
      setEmployees(res.employees);
    } catch (err: any) {
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(employee: Employee, tempPassword: string) {
    setShowModal(false);
    setNewCred({ employee, tempPassword });
    load();
  }

  const filtered = employees.filter(e => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return e.full_name.toLowerCase().includes(q) ||
      e.company_email.toLowerCase().includes(q) ||
      (e.employee_code || '').toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email or code…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full text-xs border border-[#E2E8F0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] placeholder-gray-400 bg-white"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* New credential banner */}
      {newCred && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-green-800 mb-1">
                ✅ Account created for {newCred.employee.full_name}
              </div>
              <div className="text-xs text-green-700 mb-2">
                Share these credentials securely — temporary password is shown only once.
              </div>
              <div className="bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono text-[#172554] space-y-0.5">
                <div><span className="text-gray-500">Email:</span> {newCred.employee.company_email}</div>
                <div><span className="text-gray-500">Temp Password:</span> <span className="font-bold text-[#1D4ED8]">{newCred.tempPassword}</span></div>
              </div>
            </div>
            <button onClick={() => setNewCred(null)} className="text-green-600 hover:text-green-800 ml-3 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#172554] text-white">
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide hidden md:table-cell">Code</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide hidden lg:table-cell">Email</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Role</th>
                <th className="text-left px-3 py-2.5 font-medium text-xs tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-400">No employees found.</td>
                </tr>
              ) : (
                filtered.map((emp, i) => (
                  <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EFF6FF]/40'}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#172554]">{emp.full_name}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 hidden md:table-cell">
                      {emp.employee_code || '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-[11px] hidden lg:table-cell">
                      {emp.company_email}
                    </td>
                    <td className="px-3 py-2"><RoleBadge role={emp.role} /></td>
                    <td className="px-3 py-2"><StatusBadge status={emp.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-[#E2E8F0] bg-gray-50 text-xs text-gray-500">
          {loading ? '' : `${filtered.length} employee${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {showModal && (
        <OnboardingModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
