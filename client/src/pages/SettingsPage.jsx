import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { RoleBadge } from '../components/common/Badge';
import { Settings, User, Lock, Shield, CheckCircle2, Sparkles, Database } from 'lucide-react';

export function SettingsPage() {
  const { user, refreshUser, isManager } = useAuth();
  const toast = useToast();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setPasswordError('');
    setChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Account & System Configuration
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          View your profile credentials, change security passwords, and verify system integration status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Profile & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: User Profile Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-500" />
              Profile Details
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Full Name</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assigned Role</span>
                <div className="mt-1">
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Department / Team</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {user?.department || 'Operations'}
                </span>
              </div>
            </div>

            {user?.skills && user.skills.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Routing Skills & Category Match:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {user.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Password Update */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-slate-500" />
              Change Password
            </h3>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 Col): System Telemetry & Architecture Details */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-slate-500" />
              Platform Architecture
            </h4>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Database Engine:</span>
                <strong className="text-slate-800">PostgreSQL (Prisma ORM)</strong>
              </div>
              <div className="flex justify-between">
                <span>API Architecture:</span>
                <strong className="text-slate-800">Express REST v1</strong>
              </div>
              <div className="flex justify-between">
                <span>Auth Protocol:</span>
                <strong className="text-slate-800">JWT + HTTP-Only Cookie</strong>
              </div>
              <div className="flex justify-between">
                <span>SLA Dispatcher:</span>
                <strong className="text-emerald-700">Idempotent Cron Job</strong>
              </div>
              <div className="flex justify-between">
                <span>Priority Engine:</span>
                <strong className="text-slate-800">Deterministic Rule Scorer</strong>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/70 to-white p-5 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Interview Demo Guide</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              ResolveIQ is pre-seeded with 22 authentic complaints across technical outages, billing disputes, account access, and security compliance.
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Use the top-right profile menu to switch roles or test ticket transitions between Agent and Customer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
