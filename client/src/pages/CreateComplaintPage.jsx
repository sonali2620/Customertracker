import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { PriorityBadge } from '../components/common/Badge';
import {
  ArrowLeft,
  Sparkles,
  Send,
  AlertTriangle,
  Flame,
  Shield,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

export function CreateComplaintPage() {
  const navigate = useNavigate();
  const { user, isCustomer, isManager, isAgent } = useAuth();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    impact: 'Moderate',
    urgency: 'Normal',
    affectedUsers: 1,
    manualPriority: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [error, setError] = useState('');

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.getCategories();
        if (res?.data && res.data.length > 0) {
          setCategories(res.data);
          setFormData(prev => ({ ...prev, categoryId: res.data[0].id }));
        }
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    }
    loadCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // AI Assistance: Auto-classify from Title & Description
  const handleAiSuggest = async () => {
    if (!formData.title && !formData.description) {
      toast.warning('Please enter a title or description first.');
      return;
    }

    setAiSuggesting(true);
    try {
      const res = await api.aiClassify({
        title: formData.title,
        description: formData.description
      });

      if (res?.data) {
        const { suggestedCategoryId, suggestedPriority, priorityExplanation } = res.data;
        if (suggestedCategoryId) {
          setFormData(prev => ({
            ...prev,
            categoryId: suggestedCategoryId
          }));
        }
        toast.success(`Copilot Suggestion: Category updated & priority evaluated as ${suggestedPriority}.`);
      }
    } catch (err) {
      toast.error('AI suggestion failed: ' + err.message);
    } finally {
      setAiSuggesting(false);
    }
  };

  // Deterministic Priority Preview Calculation in Frontend
  const computeClientSuggestedPriority = () => {
    let score = 0;
    const { impact, urgency, affectedUsers } = formData;

    if (impact === 'Critical') score += 40;
    else if (impact === 'High') score += 28;
    else if (impact === 'Moderate') score += 16;
    else score += 6;

    if (urgency === 'Critical') score += 30;
    else if (urgency === 'High') score += 20;
    else if (urgency === 'Normal') score += 12;
    else score += 4;

    const count = parseInt(affectedUsers, 10) || 1;
    if (count > 100) score += 20;
    else if (count > 25) score += 15;
    else if (count > 5) score += 10;
    else if (count > 1) score += 5;
    else score += 2;

    score += 10; // Category base weight

    if (score >= 75) return { priority: 'CRITICAL', score };
    if (score >= 55) return { priority: 'HIGH', score };
    if (score >= 32) return { priority: 'MEDIUM', score };
    return { priority: 'LOW', score };
  };

  const preview = computeClientSuggestedPriority();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.categoryId) {
      setError('Please fill in all required fields.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await api.createComplaint({
        ...formData,
        affectedUsers: parseInt(formData.affectedUsers, 10) || 1
      });

      toast.success(`Complaint ${res.data.ticketNumber} registered successfully!`);
      navigate(`/complaints/${res.data.id}`);
    } catch (err) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <Link
          to="/complaints"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors border border-slate-200 bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Register New Service Complaint
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit an operational or service issue to initiate automated routing and SLA tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Complaint Title / Subject *
                </label>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiSuggesting}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiSuggesting ? 'Analyzing...' : 'AI Auto-Classify'}</span>
                </button>
              </div>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Payment Gateway 502 Bad Gateway during checkout"
                required
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Service Domain Category *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white font-medium"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detailed Complaint Description *
              </label>
              <textarea
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Provide comprehensive details: what failed, error codes, steps to reproduce, impact..."
                required
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
              />
            </div>

            {/* Impact, Urgency, Affected Users Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Impact
                </label>
                <select
                  name="impact"
                  value={formData.impact}
                  onChange={handleChange}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="Critical">Critical (Total Blockage / Outage)</option>
                  <option value="High">High (Core Feature Impaired)</option>
                  <option value="Moderate">Moderate (Workaround Available)</option>
                  <option value="Low">Low (Cosmetic / Inconvenience)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Urgency
                </label>
                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="Critical">Critical (Immediate response)</option>
                  <option value="High">High (Resolve Today)</option>
                  <option value="Normal">Normal (Standard SLA)</option>
                  <option value="Low">Low (Flexible timeline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Affected Users Count
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  name="affectedUsers"
                  value={formData.affectedUsers}
                  onChange={handleChange}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                />
              </div>
            </div>

            {/* Staff Manual Override Option */}
            {!isCustomer && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Staff Manual Priority Override (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">Manager / Agent Override</span>
                </div>
                <select
                  name="manualPriority"
                  value={formData.manualPriority}
                  onChange={handleChange}
                  className="mt-1 w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:ring-1 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                >
                  <option value="">Use System Calculated Priority ({preview.priority})</option>
                  <option value="CRITICAL">Override to CRITICAL</option>
                  <option value="HIGH">Override to HIGH</option>
                  <option value="MEDIUM">Override to MEDIUM</option>
                  <option value="LOW">Override to LOW</option>
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/complaints"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm shadow-indigo-600/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Registering Ticket...' : 'Register Complaint'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Real-time Priority Engine Preview Sidebar (1 Col) */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-white p-5 rounded-2xl border border-indigo-100/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-indigo-100 pb-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Priority Engine Preview
              </h3>
            </div>

            <div className="text-center py-3 bg-white rounded-xl border border-indigo-50 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Calculated Priority
              </span>
              <div className="flex justify-center">
                <PriorityBadge priority={formData.manualPriority || preview.priority} />
              </div>
              <span className="text-[11px] text-slate-500 block font-mono">
                Composite Score: {preview.score} / 100
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800">Deterministic Rule Evaluation:</p>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Impact Factor: {formData.impact}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Urgency SLA: {formData.urgency}</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Affected Scope: {formData.affectedUsers} user(s)</span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl text-[11px] text-indigo-900 leading-relaxed border border-indigo-100/60">
              Upon submission, ResolveIQ will immediately generate a unique human-readable ticket ID (RIQ-2026-NNNNN), compute SLA deadlines in UTC, and route to the best-suited support specialist.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
