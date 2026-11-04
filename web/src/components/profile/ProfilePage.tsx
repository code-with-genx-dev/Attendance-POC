import { useState, useEffect } from 'react';
import { authApi } from '../../services/api';

interface UserProfile {
  id: number;
  company_email: string;
  full_name: string;
  role: string;
  status: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await authApi.me();
      setProfile(res.user);
      setFullName(res.user.full_name);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleNameSave() {
    if (!fullName.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.updateProfile(fullName.trim());
      setMessage('Name updated successfully');
      setEditing(false);
      await loadProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange() {
    setError('');
    setMessage('');
    
    if (!currentPassword || !newPassword) {
      setError('All password fields are required');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!profile) {
    return <div className="flex items-center justify-center py-20">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#172554]">{profile.full_name}</h1>
            <p className="text-sm text-gray-500">{profile.company_email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              {profile.role}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#172554] mb-4">Profile Information</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            {editing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
                <button
                  onClick={handleNameSave}
                  disabled={loading}
                  className="px-4 py-2 bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1e40af] disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFullName(profile.full_name);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{profile.full_name}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-[#1D4ED8] text-sm hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-500">
              {profile.company_email} (read-only)
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-500">
              {profile.role} (read-only)
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#172554] mb-4">Change Password</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={loading}
            className="w-full px-4 py-2 bg-[#1D4ED8] text-white rounded-lg hover:bg-[#1e40af] disabled:opacity-50 font-medium"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
