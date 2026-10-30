import React, { useState } from 'react';
import { employeeApi, CreateEmployeePayload } from '../../services/api';

interface Props {
  onClose: () => void;
  onCreated: (employee: any, tempPassword: string) => void;
}

export default function OnboardingModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<CreateEmployeePayload>({
    company_email: '',
    full_name: '',
    employee_code: '',
    role: 'Employee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field: keyof CreateEmployeePayload, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: CreateEmployeePayload = {
        company_email: form.company_email.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        ...(form.employee_code?.trim() ? { employee_code: form.employee_code.trim() } : {})
      };
      const res = await employeeApi.create(payload);
      onCreated(res.employee, res.temporaryPassword);
    } catch (err: any) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
        {/* Header */}
        <div className="bg-[#172554] px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Onboard New Employee</h3>
          <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1.5 uppercase tracking-wide">
              Company Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={form.company_email}
              onChange={e => set('company_email', e.target.value)}
              placeholder="employee@company.com"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent text-[#172554]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1.5 uppercase tracking-wide">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent text-[#172554]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1.5 uppercase tracking-wide">
              Employee Code <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={form.employee_code}
              onChange={e => set('employee_code', e.target.value)}
              placeholder="EMP-001"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent text-[#172554]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#172554] mb-1.5 uppercase tracking-wide">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value as 'Admin' | 'Employee')}
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent text-[#172554] bg-white"
            >
              <option value="Employee">Employee</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div className="pt-1 text-xs text-gray-500 bg-[#EFF6FF] rounded-lg px-3 py-2.5">
            A temporary password (8–10 characters) will be generated automatically. Share it securely with the employee — they must change it on first login.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-[#E2E8F0] text-[#172554] rounded-lg hover:bg-[#EFF6FF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-[#1D4ED8] hover:bg-[#1e40af] disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

