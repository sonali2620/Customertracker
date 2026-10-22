import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  BarChart3,
  Calendar,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  RefreshCw,
  Users
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

export function ReportsPage() {
  const { isCustomer } = useAuth();
  const toast = useToast();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardMetrics({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      });
      if (res?.data) {
        setData(res.data);
      }
    } catch (e) {
      toast.error('Failed to load analytics: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await api.exportCSV({ dateFrom, dateTo });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resolveiq-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary || {};
  const charts = data?.charts || { byCategory: [], byPriority: [], byStatus: [], trends: [] };
  const agentPerformance = data?.agentPerformance || [];

  const CATEGORY_COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6'];

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports & Service Quality Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Database-aggregated performance indicators, resolution timelines, and agent throughput.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Pickers */}
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-slate-700 outline-none text-xs p-1"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-slate-700 outline-none text-xs p-1"
            />
          </div>

          <button
            onClick={fetchReports}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Apply Date Filter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export Dataset'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Avg First Response</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {summary.avgFirstResponseHours || '0.0'} <span className="text-xs font-normal text-slate-500">hrs</span>
          </span>
          <span className="text-[10px] text-slate-400">Initial acknowledgment SLA</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Avg Resolution Time</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {summary.avgResolutionHours || '0.0'} <span className="text-xs font-normal text-slate-500">hrs</span>
          </span>
          <span className="text-[10px] text-slate-400">Submission to fix verified</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">SLA Compliance</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
            {summary.slaComplianceRate ?? 100}%
          </span>
          <span className="text-[10px] text-slate-400">Resolved within target window</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Customer CSAT Score</span>
          <span className="text-xl font-extrabold text-amber-600 mt-1 flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-500" />
            {summary.csatAverage || '0.0'} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
          </span>
          <span className="text-[10px] text-slate-400">{summary.csatTotalReviews || 0} customer ratings</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Volume by Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Complaints by Category Domain</h3>
          <p className="text-xs text-slate-500 mb-4">Relative frequency of customer issues</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.byCategory}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {charts.byCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Resolution Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Current Ticket Status Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Tickets currently in flight across lifecycle stages</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.byStatus} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 9, fill: '#64748b' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Agent Performance & Throughput Table (Staff View) */}
      {!isCustomer && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Support Agent Resolution & Capacity Metrics</h3>
              <p className="text-xs text-slate-500">Individual specialist throughput and SLA adherence</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Specialist Agent</th>
                  <th className="py-3 px-4">Department Tier</th>
                  <th className="py-3 px-4">Current Active Workload</th>
                  <th className="py-3 px-4">Total Resolved</th>
                  <th className="py-3 px-4 text-right">SLA Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentPerformance.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{agent.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{agent.department || 'Support'}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-mono">
                      {agent.activeWorkload} / {agent.maxCapacity} tickets
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">
                      {agent.totalResolved} tickets
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {agent.slaCompliance}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
