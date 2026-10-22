import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  Play,
  Settings2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export function SLAMonitoringPage() {
  const { isManager } = useAuth();
  const toast = useToast();

  const [policies, setPolicies] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [overdueTickets, setOverdueTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Edit Policy Modal State
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({ firstResponseHours: '', resolutionHours: '' });

  const loadSLAData = async () => {
    setLoading(true);
    try {
      const [policiesRes, escalationsRes, overdueRes] = await Promise.all([
        api.getSLAPolicies(),
        api.getEscalations(),
        api.getComplaints({ limit: 50 })
      ]);

      if (policiesRes?.data) setPolicies(policiesRes.data);
      if (escalationsRes?.data) setEscalations(escalationsRes.data);
      if (overdueRes?.data) {
        const filteredOverdue = overdueRes.data.filter(t => t.sla?.status === 'OVERDUE' || t.sla?.status === 'AT_RISK');
        setOverdueTickets(filteredOverdue);
      }
    } catch (e) {
      toast.error('Failed to load SLA monitoring data: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSLAData();
  }, []);

  // Trigger manual escalation check
  const handleTriggerCheck = async () => {
    setTriggering(true);
    try {
      const res = await api.triggerSLACheck();
      toast.success(res.message || 'SLA check finished.');
      loadSLAData();
    } catch (err) {
      toast.error('SLA check failed: ' + err.message);
    } finally {
      setTriggering(false);
    }
  };

  // Save updated policy
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!editingPolicy) return;

    try {
      await api.updateSLAPolicy(editingPolicy.priority, {
        firstResponseHours: parseFloat(policyForm.firstResponseHours),
        resolutionHours: parseFloat(policyForm.resolutionHours)
      });
      toast.success(`Updated SLA policy for ${editingPolicy.priority}.`);
      setEditingPolicy(null);
      loadSLAData();
    } catch (err) {
      toast.error(err.message || 'Failed to update policy.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              SLA Monitoring & Escalation Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated compliance tracking, at-risk warnings, and background escalation dispatcher.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleTriggerCheck}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            <span>{triggering ? 'Scanning Queues...' : 'Run SLA Escalation Scan'}</span>
          </button>
        </div>
      </div>

      {/* Configured SLA Policies Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Configured SLA Targets by Priority</h3>
          <span className="text-xs text-slate-400">Timestamps calculated in UTC</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <PriorityBadge priority={policy.priority} />
                {isManager && (
                  <button
                    onClick={() => {
                      setEditingPolicy(policy);
                      setPolicyForm({
                        firstResponseHours: policy.firstResponseHours,
                        resolutionHours: policy.resolutionHours
                      });
                    }}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600"
                    title="Edit SLA Hours"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>First Response:</span>
                  <span className="font-bold text-slate-900">
                    {policy.firstResponseHours < 1
                      ? `${Math.round(policy.firstResponseHours * 60)} mins`
                      : `${policy.firstResponseHours} hours`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Target Resolution:</span>
                  <span className="font-bold text-slate-900">{policy.resolutionHours} hours</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live At-Risk & Overdue Complaints Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Active At-Risk & Overdue Complaints ({overdueTickets.length})
            </h3>
            <p className="text-xs text-slate-500">Tickets requiring immediate agent intervention</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {overdueTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-700 bg-emerald-50/40">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              All active tickets are currently compliant within target SLA deadlines.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Breach Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      <Link to={`/complaints/${t.id}`}>{t.ticketNumber}</Link>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {t.title}
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4">
                      <SLABadge sla={t.sla} />
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {t.assignedAgent?.name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/complaints/${t.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Investigate &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Escalation History Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Escalation History & Dispatch Log</h3>
          <p className="text-xs text-slate-500">Idempotent audit trail of automated SLA breaches</p>
        </div>

        <div className="overflow-x-auto">
          {escalations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No escalation events registered.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Escalation Reason</th>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Severity Level</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {escalations.map((esc) => (
                  <tr key={esc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(esc.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{esc.reason}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      <Link to={`/complaints/${esc.complaint?.id}`}>
                        {esc.complaint?.ticketNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                        Level {esc.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {esc.complaint?.assignedAgent?.name || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit SLA Policy Modal */}
      {editingPolicy && (
        <Modal
          isOpen={Boolean(editingPolicy)}
          onClose={() => setEditingPolicy(null)}
          title={`Edit SLA Policy (${editingPolicy.priority})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSavePolicy} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Response Target (Hours)
              </label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                value={policyForm.firstResponseHours}
                onChange={(e) => setPolicyForm({ ...policyForm, firstResponseHours: e.target.value })}
                required
                className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                0.25 = 15 minutes, 1.0 = 1 hour, 4.0 = 4 hours
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution Target (Hours)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={policyForm.resolutionHours}
                onChange={(e) => setPolicyForm({ ...policyForm, resolutionHours: e.target.value })}
                required
                className="w-full p-2 text-xs rounded-xl border border-slate-200 outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Save SLA Policy
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
