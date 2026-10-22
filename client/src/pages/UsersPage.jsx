import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { RoleBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/Skeleton';
import { Users, UserPlus, Search, Shield, Building, Phone, Mail, CheckCircle2, XCircle } from 'lucide-react';

export function UsersPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [usersList, setUsersList] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
    department: '',
    phone: '',
    maxWorkload: 10,
    skills: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers({
        role: roleFilter || undefined,
        search: search || undefined
      });
      if (res?.data) {
        setUsersList(res.data);
      }
    } catch (e) {
      toast.error('Failed to load users: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const skillsArray = newUser.skills
        ? newUser.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      await api.createUser({
        ...newUser,
        skills: skillsArray
      });

      toast.success(`User ${newUser.name} created successfully.`);
      setCreateModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'AGENT',
        department: '',
        phone: '',
        maxWorkload: 10,
        skills: ''
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  // Toggle user active status
  const handleToggleActive = async (targetUser) => {
    try {
      await api.updateUser(targetUser.id, {
        isActive: !targetUser.isActive
      });
      toast.success(`User ${targetUser.name} is now ${!targetUser.isActive ? 'Active' : 'Inactive'}.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Customer & User Administration
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage customer accounts, support specialists, capacities, and permissions.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') fetchUsers();
            }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customers Only</option>
          <option value="AGENT">Support Agents Only</option>
          <option value="MANAGER">Managers Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department / Org</th>
                  <th className="py-3 px-4">Workload Capacity</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {u.department || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {u.role === 'AGENT' ? `${u.maxWorkload} tickets max` : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            u.isActive
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User Account"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Password *
            </label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role *
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white outline-none"
              >
                <option value="AGENT">Support Agent</option>
                <option value="MANAGER">Manager / Admin</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Workload (Agents)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={newUser.maxWorkload}
                onChange={(e) => setNewUser({ ...newUser, maxWorkload: parseInt(e.target.value, 10) })}
                className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department / Specialty
            </label>
            <input
              type="text"
              value={newUser.department}
              onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
              placeholder="e.g. Platform Tier 2, Billing"
              className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Skills (Comma Separated for Auto-Assignment)
            </label>
            <input
              type="text"
              value={newUser.skills}
              onChange={(e) => setNewUser({ ...newUser, skills: e.target.value })}
              placeholder="e.g. Billing, Outage, Security"
              className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
            >
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
