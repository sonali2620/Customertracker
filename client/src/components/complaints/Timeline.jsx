import React from 'react';
import { StatusBadge } from '../common/Badge';
import { Clock, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function Timeline({ statusHistory = [], assignmentHistory = [], escalationHistory = [] }) {
  // Merge and sort all events chronologically (most recent first)
  const allEvents = [
    ...statusHistory.map(item => ({
      type: 'STATUS',
      id: `status-${item.id}`,
      title: `Status: ${item.newStatus.replace(/_/g, ' ')}`,
      previous: item.previousStatus,
      newStatus: item.newStatus,
      actor: item.changedBy?.name || 'System',
      role: item.changedBy?.role,
      reason: item.reason,
      createdAt: new Date(item.createdAt),
      icon: Clock,
      color: 'bg-indigo-600'
    })),
    ...assignmentHistory.map(item => ({
      type: 'ASSIGNMENT',
      id: `assign-${item.id}`,
      title: item.newAgent ? `Assigned to ${item.newAgent.name}` : 'Unassigned',
      previous: item.previousAgent?.name,
      actor: item.assignedBy?.name || 'System',
      role: item.assignedBy?.role,
      reason: item.reason,
      createdAt: new Date(item.createdAt),
      icon: UserCheck,
      color: 'bg-blue-600'
    })),
    ...escalationHistory.map(item => ({
      type: 'ESCALATION',
      id: `esc-${item.id}`,
      title: 'SLA Escalation Triggered',
      actor: 'SLA Monitor Engine',
      reason: item.reason,
      createdAt: new Date(item.createdAt),
      icon: ShieldAlert,
      color: 'bg-rose-600'
    }))
  ];

  allEvents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (allEvents.length === 0) {
    return <div className="p-4 text-xs text-slate-500 text-center">No timeline records yet.</div>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {allEvents.map((event, idx) => {
          const isLast = idx === allEvents.length - 1;
          const Icon = event.icon;

          return (
            <li key={event.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white shadow-xs ${event.color}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">{event.title}</p>
                      <time
                        dateTime={event.createdAt.toISOString()}
                        className="text-[11px] text-slate-400 font-medium"
                      >
                        {event.createdAt.toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </time>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5">
                      By <span className="font-semibold text-slate-700">{event.actor}</span>
                      {event.role ? ` (${event.role.toLowerCase()})` : ''}
                    </p>

                    {event.reason && (
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                        {event.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
