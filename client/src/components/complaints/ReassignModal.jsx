import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { UserCheck, Shield } from 'lucide-react';

export function ReassignModal({ isOpen, onClose, complaintId, currentAgentId, onReassigned }) {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAgents() {
      if (!isOpen) return;
      setFetching(true);
      setError('');
      try {
        const res = await api.getAgents();
        if (res?.data) {
          setAgents(res.data);
          // Set default to first different agent
          const firstDifferent = res.data.find(a => a.id !== currentAgentId);
          if (firstDifferent) {
            setSelectedAgentId(firstDifferent.id);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load support agents.');
      } finally {
        setFetching(false);
      }
    }

    loadAgents();
  }, [isOpen, currentAgentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setError('Please select an agent.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.assignAgent(complaintId, {
        agentId: selectedAgentId,
        reason: reason.trim() || 'Manual reassignment by manager'
      });
      onReassigned();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reassign agent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign / Reassign Support Agent" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            Select Active Support Agent
          </label>

          {fetching ? (
            <div className="text-center py-6 text-xs text-slate-500">Loading agents...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {agents.map((agent) => {
                const isCurrent = agent.id === currentAgentId;
                const isSelected = selectedAgentId === agent.id;

                return (
                  <label
                    key={agent.id}
                    className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="agentSelect"
                        value={agent.id}
                        checked={isSelected}
                        onChange={() => setSelectedAgentId(agent.id)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{agent.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{agent.department || 'Support'}</p>
                        {agent.skills && agent.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {agent.skills.map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          agent.isAtCapacity ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {agent.activeWorkload} / {agent.maxWorkload}
                      </span>
                      <span className="text-[10px] text-slate-400 block">workload</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason for Assignment / Reassignment
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Specialized tier 2 routing, workload rebalancing..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

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
            disabled={loading || !selectedAgentId}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
          >
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
