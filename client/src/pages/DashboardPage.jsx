import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../components/common/Badge';
import { CardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  Inbox,
  Clock,
  Flame,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Sparkles,
  BarChart2,
  UserCheck,
  Star,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export function DashboardPage() {
  const { user, isCustomer, isAgent, isManager } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboardMetrics();
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const summary = data?.summary || {
    totalComplaints: 0,
    openComplaints: 0,
    criticalComplaints: 0,
    overdueComplaints: 0,
    resolvedComplaints: 0,
    avgResolutionHours: '0.0',
    avgFirstResponseHours: '0.0',
    slaComplianceRate: 100,
    reopenRate: 0,
    csatAverage: '0.0',
    csatTotalReviews: 0
  };

  const charts = data?.charts || {
    byCategory: [],
    byPriority: [],
    byStatus: [],
    trends: []
  };

  const recentComplaints = data?.recentComplaints || [];
  const agentPerformance = data?.agentPerformance || [];

  // Theme Colors for Charts
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const PRIORITY_COLORS = {
    CRITICAL: '#e11d48',
    HIGH: '#f59e0b',
    MEDIUM: '#6366f1',
    LOW: '#94a3b8'
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-center">
        <p className="text-sm font-semibold text-rose-800">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Executive Operational Overview
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Welcome back, {user?.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCustomer
              ? 'Track the status, investigation timeline, and resolution of your registered service complaints.'
              : isAgent
              ? 'Manage your assigned complaints, meet response deadlines, and maintain high customer satisfaction.'
              : 'Real-time service telemetry, resolution times, SLA compliance, and cross-team workload balance.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMetrics}
            title="Refresh Data"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/complaints/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Complaint</span>
          </Link>
        </div>
      </div>

      {/* KPI Statistic Cards (Top Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Complaints */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Registered</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{summary.totalComplaints}</p>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{summary.openComplaints}</span>
            <span>active & in progress</span>
          </div>
        </div>

        {/* Card 2: Critical Priority */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Critical Incidents</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{summary.criticalComplaints}</p>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-rose-600 font-medium">
            <span>High business impact</span>
          </div>
        </div>

        {/* Card 3: Overdue SLA */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">SLA Overdue</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{summary.overdueComplaints}</p>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-amber-700 font-medium">
            <span>Breached target deadline</span>
          </div>
        </div>

        {/* Card 4: SLA Compliance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">SLA Compliance</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{summary.slaComplianceRate}%</p>
          <div className="flex items-center space-x-2 mt-2 text-[11px] text-emerald-600 font-medium">
            <span>Avg resolution: {summary.avgResolutionHours}h</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="border-r border-slate-100 pr-3">
          <span className="text-slate-400 block font-medium">Avg First Response</span>
          <span className="text-sm font-bold text-slate-800">{summary.avgFirstResponseHours} hours</span>
        </div>
        <div className="border-r border-slate-100 pr-3">
          <span className="text-slate-400 block font-medium">Reopen Rate</span>
          <span className="text-sm font-bold text-slate-800">{summary.reopenRate}%</span>
        </div>
        <div className="border-r border-slate-100 pr-3">
          <span className="text-slate-400 block font-medium">CSAT Rating</span>
          <span className="text-sm font-bold text-amber-600 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {summary.csatAverage} / 5.0
          </span>
        </div>
        <div>
          <span className="text-slate-400 block font-medium">Total Reviews</span>
          <span className="text-sm font-bold text-slate-800">{summary.csatTotalReviews} responses</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Complaint Inflow & Resolution Trends (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Complaint Activity & Inflow Trends</h3>
              <p className="text-xs text-slate-500">Total complaints submitted vs resolved</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {charts.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Complaints Inflow"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved Tickets"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResolved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Insufficient trend data points for chart display.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Priority Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Priority Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown of current tickets by severity</p>
          </div>
          <div className="h-56 w-full my-auto">
            {charts.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.byPriority} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="priority" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {charts.byPriority.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PRIORITY_COLORS[entry.priority] || '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No priority metrics available.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Low
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Complaints Table + Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Complaints (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Complaints Queue</h3>
              <p className="text-xs text-slate-500">Live stream of customer inquiries and tickets</p>
            </div>
            <Link
              to="/complaints"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentComplaints.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No complaints registered yet.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ticket ID</th>
                    <th className="py-3 px-4">Title & Category</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentComplaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        <Link to={`/complaints/${c.id}`} className="hover:underline">
                          {c.ticketNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <Link
                          to={`/complaints/${c.id}`}
                          className="font-semibold text-slate-800 hover:text-indigo-600 block truncate"
                        >
                          {c.title}
                        </Link>
                        <span className="text-[11px] text-slate-400">{c.category?.name}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {c.assignedAgent?.name || (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Team Workload & Distribution (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isCustomer ? 'Categories Breakdown' : 'Agent Workload Capacity'}
              </h3>
            </div>

            {isCustomer ? (
              <div className="space-y-3">
                {charts.byCategory.slice(0, 5).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate max-w-[180px]">{cat.name}</span>
                    <span className="font-bold text-slate-900">{cat.count} tickets</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {agentPerformance.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No active agents loaded.</p>
                ) : (
                  agentPerformance.map((agent) => {
                    const ratio = Math.min(100, (agent.activeWorkload / agent.maxCapacity) * 100);
                    const isHigh = ratio >= 80;

                    return (
                      <div key={agent.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{agent.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {agent.activeWorkload} / {agent.maxCapacity} tickets
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh ? 'bg-rose-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{agent.department || 'Tier 2 Support'}</span>
                          <span>{agent.slaCompliance}% SLA compliant</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              to={isCustomer ? '/complaints/new' : '/sla-monitoring'}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-between"
            >
              <span>{isCustomer ? 'Submit new inquiry' : 'View SLA policy details'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
