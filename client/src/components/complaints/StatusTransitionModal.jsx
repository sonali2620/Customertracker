import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { STATUSES, VALID_TRANSITIONS } from '../../../../server/src/config/constants.js';

export function StatusTransitionModal({
  isOpen,
  onClose,
  currentStatus,
  complaintTitle,
  ticketNumber,
  onTransition,
  userRole
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Determine permitted next statuses based on state machine and user role
  const rawTransitions = VALID_TRANSITIONS[currentStatus] || [];
  let allowedStatuses = [...rawTransitions];

  if (userRole === 'CUSTOMER') {
    // Customer can only Close (from RESOLVED) or Reopen (from RESOLVED or CLOSED)
    allowedStatuses = allowedStatuses.filter(s => {
      if (currentStatus === 'RESOLVED') return s === 'CLOSED' || s === 'REOPENED';
      if (currentStatus === 'CLOSED') return s === 'REOPENED';
      return false;
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) {
      setError('Please select a target status.');
      return;
    }

    if (selectedStatus === 'REOPENED' && (!reason || reason.trim().length < 5)) {
      setError('A detailed reason (at least 5 characters) is required when reopening a ticket.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await onTransition({
        newStatus: selectedStatus,
        reason: reason.trim(),
        resolutionNotes: resolutionNotes.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Complaint Status" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="text-xs text-slate-500 font-medium block">Ticket {ticketNumber}</span>
          <h4 className="text-sm font-semibold text-slate-800 line-clamp-1">{complaintTitle}</h4>
        </div>

        <div className="flex items-center space-x-2 py-2 border-y border-slate-100">
          <span className="text-xs text-slate-500">Current Status:</span>
          <StatusBadge status={currentStatus} />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Next Permitted Status *
          </label>
          <div className="grid grid-cols-1 gap-2">
            {allowedStatuses.map((status) => (
              <label
                key={status}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedStatus === status
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="targetStatus"
                    value={status}
                    checked={selectedStatus === status}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <StatusBadge status={status} />
                </div>
              </label>
            ))}
          </div>
          {allowedStatuses.length === 0 && (
            <p className="text-xs text-slate-500 italic mt-1">
              No further automatic transitions are permitted from current status {currentStatus}.
            </p>
          )}
        </div>

        {selectedStatus === 'RESOLVED' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resolution Investigation Findings & Notes *
            </label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe the root cause and steps taken to resolve this customer complaint..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required
            />
          </div>
        )}

        {(selectedStatus === 'REOPENED' || selectedStatus) && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {selectedStatus === 'REOPENED' ? 'Reason for Reopening *' : 'Transition Reason / Audit Note (Optional)'}
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                selectedStatus === 'REOPENED'
                  ? 'Please explain why the issue is not resolved...'
                  : 'Record operational reason for this transition...'
              }
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              required={selectedStatus === 'REOPENED'}
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedStatus || allowedStatuses.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {loading ? 'Updating...' : 'Confirm Status Change'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
