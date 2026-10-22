import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../components/common/Badge';
import { Pagination } from '../components/common/Pagination';
import { TableSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  RefreshCw,
  SlidersHorizontal,
  X
} from 'lucide-react';

export function ComplaintsListPage() {
  const { user, isCustomer } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Filter States from URL or Defaults
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  // Load categories for dropdown
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.getCategories();
        if (res?.data) setCategories(res.data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchCategories();
  }, []);

  // Fetch complaints with current query params
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getComplaints({
        page,
        limit: 10,
        search,
        status,
        priority,
        categoryId,
        sortBy,
        sortOrder
      });

      if (res?.data) {
        setComplaints(res.data);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, priority, categoryId, sortBy, sortOrder]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategoryId('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Export CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const blob = await api.exportCSV({ status, priority, categoryId });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resolveiq-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = Boolean(search || status || priority || categoryId);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isCustomer ? 'My Complaints' : 'Customer Complaints Master Queue'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCustomer
              ? 'View all complaints submitted by your account and their live resolution status.'
              : 'Enterprise-wide ticket registry with SLA tracking, filter criteria, and assignment routing.'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            disabled={exporting || complaints.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <Link
            to="/complaints/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Complaint</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID (e.g. RIQ-2026-00001), title, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_CUSTOMER">Waiting on Customer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REOPENED">Reopened</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium max-w-[200px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('_');
              setSortBy(sb);
              setSortOrder(so);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="priority_desc">Highest Priority</option>
            <option value="resolutionDeadline_asc">SLA Deadline (Urgent)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Reset all filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : complaints.length === 0 ? (
          <EmptyState
            title="No complaints found"
            description={
              hasActiveFilters
                ? 'Try adjusting or clearing your search and filter criteria.'
                : 'No customer complaints have been recorded yet.'
            }
            actionText="Register First Complaint"
            actionLink="/complaints/new"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200/80 font-semibold">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Complaint Title & Customer</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SLA Target</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                      <Link to={`/complaints/${c.id}`} className="hover:underline">
                        {c.ticketNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="font-bold text-slate-900 group-hover:text-indigo-600 block line-clamp-1"
                      >
                        {c.title}
                      </Link>
                      <span className="text-[11px] text-slate-500 block truncate">
                        Customer: {c.customer?.name} ({c.customer?.email})
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {c.category?.name}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SLABadge sla={c.sla} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                      {c.assignedAgent?.name || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right text-slate-400 font-mono text-[11px]">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
