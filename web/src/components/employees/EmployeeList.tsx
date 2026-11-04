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
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder="Search by name, email or code…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full text-xs border border-[#E2E8F0] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] text-[#172554] placeholder-gray-400 bg-white shadow-sm"
          />
          {searchQ ? (
            <button
              type="button"
              onClick={() => setSearchQ('')}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs px-1"
              title="Clear search"
            >
              ✕
            </button>
          ) : null}
        </div>

        {searchQ ? (
          <button
            type="button"
            onClick={() => setSearchQ('')}
            className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Search
          </button>
        ) : null}

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1D4ED8] hover:bg-[#1e40af] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* New credential banner */}
      {newCred && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-green-800 mb-1">
                ✅ Account created for {newCred.employee.full_name}
              </div>
              <div className="text-xs text-green-700 mb-2">
                Share these credentials securely — temporary password is shown only once.
              </div>
              <div className="bg-white border border-green-200 rounded px-2.5 py-1.5 text-xs font-mono text-[#172554] space-y-0.5">
                <div><span className="text-gray-500">Email:</span> {newCred.employee.company_email}</div>
                <div><span className="text-gray-500">Temp Password:</span> <span className="font-bold text-[#1D4ED8]">{newCred.tempPassword}</span></div>
              </div>
            </div>
            <button onClick={() => setNewCred(null)} className="text-green-600 hover:text-green-800 ml-2">
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
      <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#172554] text-white">
                <th className="text-left px-2.5 py-2 font-medium text-xs tracking-wide">Name</th>
                <th className="text-left px-2.5 py-2 font-medium text-xs tracking-wide hidden md:table-cell">Code</th>
                <th className="text-left px-2.5 py-2 font-medium text-xs tracking-wide hidden lg:table-cell">Email</th>
                <th className="text-left px-2.5 py-2 font-medium text-xs tracking-wide">Role</th>
                <th className="text-left px-2.5 py-2 font-medium text-xs tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-2.5 py-6 text-center text-xs text-gray-400">Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2.5 py-6 text-center text-xs text-gray-400">No employees found.</td>
                </tr>
              ) : (
                filtered.map((emp, i) => (
                  <tr key={emp.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EFF6FF]/40'}>
                    <td className="px-2.5 py-1.5">
                      <div className="font-medium text-[#172554]">{emp.full_name}</div>
                    </td>
                    <td className="px-2.5 py-1.5 text-gray-500 hidden md:table-cell">
                      {emp.employee_code || '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-gray-500 text-[11px] hidden lg:table-cell">
                      {emp.company_email}
                    </td>
                    <td className="px-2.5 py-1.5"><RoleBadge role={emp.role} /></td>
                    <td className="px-2.5 py-1.5"><StatusBadge status={emp.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-2.5 py-1.5 border-t border-[#E2E8F0] bg-gray-50 text-xs text-gray-500 font-medium">
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
