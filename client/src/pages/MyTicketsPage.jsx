import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { TableSkeleton } from '../components/common/Skeleton';
import { UserCheck, ShieldAlert, Clock, CheckCircle2, Flame, ArrowRight } from 'lucide-react';

export function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchMyTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getComplaints({
        myTickets: 'true',
        status: filterStatus || undefined,
        limit: 50
      });
      if (res?.data) {
        setTickets(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load your assigned tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [filterStatus]);

  const activeCount = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const overdueCount = tickets.filter(t => t.sla?.status === 'OVERDUE').length;
  const criticalCount = tickets.filter(t => t.priority === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header & Personal Workload Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              My Assigned Queue
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tickets actively routed to your support tier. Prioritize by SLA deadline.
          </p>
        </div>

        {/* Workload Metric */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Workload</span>
            <span className="text-sm font-extrabold text-indigo-600">
              {activeCount} <span className="text-xs text-slate-500 font-normal">/ {user?.maxWorkload || 10} capacity</span>
            </span>
          </div>
          <div className="w-16 bg-slate-200 rounded-full h-2">
            <div
              className={`h-full rounded-full ${
                activeCount >= (user?.maxWorkload || 10) ? 'bg-rose-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min(100, (activeCount / (user?.maxWorkload || 10)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Status Pill Filters */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            !filterStatus ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          All Assigned ({tickets.length})
        </button>
        <button
          onClick={() => setFilterStatus('IN_PROGRESS')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            filterStatus === 'IN_PROGRESS' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilterStatus('WAITING_FOR_CUSTOMER')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            filterStatus === 'WAITING_FOR_CUSTOMER' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Waiting on Customer
        </button>
        <button
          onClick={() => setFilterStatus('RESOLVED')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            filterStatus === 'RESOLVED' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No tickets in queue"
            description="You currently have no open support tickets assigned to your account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80 font-semibold">
                <tr>
                  <th className="py-3 px-4">Ticket Number</th>
                  <th className="py-3 px-4">Subject & Customer</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Deadline</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      <Link to={`/complaints/${t.id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <Link
                        to={`/complaints/${t.id}`}
                        className="font-bold text-slate-900 group-hover:text-indigo-600 block line-clamp-1"
                      >
                        {t.title}
                      </Link>
                      <span className="text-[11px] text-slate-500">
                        {t.customer?.name} &bull; {t.category?.name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SLABadge sla={t.sla} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <Link
                        to={`/complaints/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Open Ticket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
