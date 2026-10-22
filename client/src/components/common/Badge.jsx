import React from 'react';
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  Minus
} from 'lucide-react';

/**
 * Status Badge Component
 */
export function StatusBadge({ status, className = '' }) {
  const statusConfig = {
    OPEN: {
      label: 'Open',
      icon: Clock,
      classes: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20'
    },
    ASSIGNED: {
      label: 'Assigned',
      icon: UserCheck,
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20'
    },
    IN_PROGRESS: {
      label: 'In Progress',
      icon: RefreshCw,
      classes: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20'
    },
    WAITING_FOR_CUSTOMER: {
      label: 'Waiting on Customer',
      icon: Clock,
      classes: 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20'
    },
    RESOLVED: {
      label: 'Resolved',
      icon: CheckCircle2,
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20'
    },
    CLOSED: {
      label: 'Closed',
      icon: CheckCircle2,
      classes: 'bg-slate-100 text-slate-700 border-slate-200 ring-1 ring-slate-400/20'
    },
    REOPENED: {
      label: 'Reopened',
      icon: AlertTriangle,
      classes: 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20'
    }
  };

  const config = statusConfig[status] || {
    label: status,
    icon: Clock,
    classes: 'bg-slate-50 text-slate-700 border-slate-200'
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * Priority Badge Component
 */
export function PriorityBadge({ priority, className = '' }) {
  const priorityConfig = {
    CRITICAL: {
      label: 'Critical',
      icon: Flame,
      classes: 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
    },
    HIGH: {
      label: 'High',
      icon: ArrowUpRight,
      classes: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    MEDIUM: {
      label: 'Medium',
      icon: Minus,
      classes: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    LOW: {
      label: 'Low',
      icon: Minus,
      classes: 'bg-slate-100 text-slate-600 border-slate-200'
    }
  };

  const config = priorityConfig[priority] || {
    label: priority,
    icon: Minus,
    classes: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${config.classes} ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * SLA Status Indicator Badge
 */
export function SLABadge({ sla, className = '' }) {
  if (!sla) return null;

  if (sla.status === 'OVERDUE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse ${className}`}
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
        <span>{sla.label || 'Overdue'}</span>
      </span>
    );
  }

  if (sla.status === 'AT_RISK') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>{sla.label || 'At Risk'}</span>
      </span>
    );
  }

  if (sla.status === 'BREACHED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}
      >
        <AlertCircle className="w-3 h-3" />
        <span>{sla.label || 'Breached'}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
    >
      <Clock className="w-3 h-3" />
      <span>{sla.label || 'On Track'}</span>
    </span>
  );
}

/**
 * Role Badge Component
 */
export function RoleBadge({ role, className = '' }) {
  const roleConfig = {
    MANAGER: { label: 'Manager / Admin', classes: 'bg-purple-100 text-purple-800 border-purple-200' },
    AGENT: { label: 'Support Agent', classes: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    CUSTOMER: { label: 'Customer', classes: 'bg-slate-100 text-slate-700 border-slate-200' }
  };

  const config = roleConfig[role] || { label: role, classes: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
