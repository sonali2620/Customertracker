import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../components/common/Badge';
import { Timeline } from '../components/complaints/Timeline';
import { CommentSection } from '../components/complaints/CommentSection';
import { StatusTransitionModal } from '../components/complaints/StatusTransitionModal';
import { ReassignModal } from '../components/complaints/ReassignModal';
import { FeedbackModal } from '../components/complaints/FeedbackModal';
import { AIAssistantDrawer } from '../components/complaints/AIAssistantDrawer';
import {
  ArrowLeft,
  Clock,
  User,
  Shield,
  Building,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Star,
  FileText,
  UserCheck
} from 'lucide-react';

export function ComplaintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCustomer, isAgent, isManager } = useAuth();
  const toast = useToast();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  // Comment text state (can be populated by AI Assistant)
  const [replyText, setReplyText] = useState('');

  const fetchComplaint = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getComplaint(id);
      if (res?.data) {
        setComplaint(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchComplaint();
  }, [fetchComplaint]);

  // Handle status transition execution
  const handleTransition = async (transitionPayload) => {
    await api.updateStatus(complaint.id, transitionPayload);
    toast.success(`Ticket status updated to ${transitionPayload.newStatus}.`);
    fetchComplaint();
  };

  // Quick Action: Customer Confirm Resolution (Resolved -> Closed)
  const handleConfirmResolution = async () => {
    try {
      await api.updateStatus(complaint.id, {
        newStatus: 'CLOSED',
        reason: 'Customer verified and confirmed issue resolution.'
      });
      toast.success('Resolution confirmed. Thank you!');
      fetchComplaint();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm resolution.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto py-8">
        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        <div className="h-72 bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-900">Unable to Open Complaint</h3>
        <p className="text-xs text-rose-700 mt-1">{error || 'Ticket not found or permission denied.'}</p>
        <Link
          to="/complaints"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Complaints</span>
        </Link>
      </div>
    );
  }

  const isResolved = complaint.status === 'RESOLVED';
  const isClosed = complaint.status === 'CLOSED';
  const hasFeedback = Boolean(complaint.feedback);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/complaints')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors border border-slate-200 bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                {complaint.ticketNumber}
              </span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <SLABadge sla={complaint.sla} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
              {complaint.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Customer Specific: Confirm Resolution */}
          {isCustomer && isResolved && (
            <button
              onClick={handleConfirmResolution}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Resolution</span>
            </button>
          )}

          {/* Customer Specific: Rate Resolution (CSAT) */}
          {isCustomer && (isResolved || isClosed) && !hasFeedback && (
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl border border-amber-300 transition-colors"
            >
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span>Leave Feedback</span>
            </button>
          )}

          {/* Reopen Ticket (for customer or staff on resolved/closed) */}
          {(isResolved || isClosed) && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reopen Ticket</span>
            </button>
          )}

          {/* Update Status (Staff or Customer) */}
          {!isClosed && (
            <button
              onClick={() => setStatusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-2xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update Status</span>
            </button>
          )}

          {/* Reassign Ticket (Manager only) */}
          {isManager && (
            <button
              onClick={() => setReassignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span>{complaint.assignedAgent ? 'Reassign Agent' : 'Assign Agent'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details (Left 2 Cols) + Sidebar Info & AI Copilot (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Problem Description, Comments, and CSAT Rating Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Complaint Description */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Complaint Information
              </span>
              <span className="text-xs font-medium text-slate-500">
                Category: <strong className="text-slate-800">{complaint.category?.name}</strong>
              </span>
            </div>

            <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </div>

            {/* Impact, Urgency, Affected Users metadata chips */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Impact</span>
                <span className="font-semibold text-slate-800">{complaint.impact || 'Moderate'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Urgency</span>
                <span className="font-semibold text-slate-800">{complaint.urgency || 'Normal'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Affected Users</span>
                <span className="font-semibold text-slate-800">{complaint.affectedUsers || 1}</span>
              </div>
            </div>

            {/* Resolution Notes Banner (if present) */}
            {complaint.resolutionNotes && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Resolution Summary</span>
                </div>
                <p className="text-emerald-800 pl-5">{complaint.resolutionNotes}</p>
              </div>
            )}

            {/* Reopening Banner (if present) */}
            {complaint.reopenReason && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reopened Investigation (Attempt #{complaint.reopenedCount})</span>
                </div>
                <p className="text-rose-800 pl-5">{complaint.reopenReason}</p>
              </div>
            )}
          </div>

          {/* Card: Customer Feedback Rating (if submitted) */}
          {complaint.feedback && (
            <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Customer Satisfaction Rating
                </span>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        complaint.feedback.rating >= s
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="ml-1.5 text-xs font-bold text-amber-900">
                    {complaint.feedback.rating}/5
                  </span>
                </div>
              </div>
              {complaint.feedback.comment && (
                <p className="text-xs text-amber-800 italic pl-5">
                  "{complaint.feedback.comment}"
                </p>
              )}
            </div>
          )}

          {/* AI Assistant Copilot (Staff Only) */}
          {!isCustomer && (
            <AIAssistantDrawer
              complaintId={complaint.id}
              onApplyDraft={(draftText) => setReplyText(draftText)}
            />
          )}

          {/* Comment & Discussion Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <CommentSection
              complaintId={complaint.id}
              comments={complaint.comments || []}
              onCommentAdded={fetchComplaint}
              replyText={replyText}
              setReplyText={setReplyText}
            />
          </div>
        </div>

        {/* Right Column (1 Col): SLA Target, Customer, Agent, and Timeline */}
        <div className="space-y-6">
          {/* Card: SLA Deadlines & Timeline */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              SLA Commitments & Deadlines
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Response Target:
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.responseDeadline
                    ? new Date(complaint.responseDeadline).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Standard'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> Resolution Target:
                </span>
                <span className="font-semibold text-slate-800">
                  {complaint.resolutionDeadline
                    ? new Date(complaint.resolutionDeadline).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Standard'}
                </span>
              </div>

              {complaint.firstResponseAt && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500">First Staff Response:</span>
                  <span className="text-emerald-700 font-semibold">
                    {new Date(complaint.firstResponseAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {complaint.resolvedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Resolved Timestamp:</span>
                  <span className="text-emerald-700 font-semibold">
                    {new Date(complaint.resolvedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Customer Information */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Customer Details
            </h4>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                {complaint.customer?.name ? complaint.customer.name.charAt(0) : 'C'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{complaint.customer?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{complaint.customer?.email}</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 text-xs text-slate-600">
              {complaint.customer?.department && (
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{complaint.customer.department}</span>
                </div>
              )}
              {complaint.customer?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{complaint.customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Assigned Agent */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Assigned Support Specialist
              </h4>
              {isManager && (
                <button
                  onClick={() => setReassignModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Change
                </button>
              )}
            </div>

            {complaint.assignedAgent ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-sm">
                  {complaint.assignedAgent.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {complaint.assignedAgent.name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {complaint.assignedAgent.department || 'Tier 2 Specialist'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                This ticket is currently unassigned.
              </div>
            )}
          </div>

          {/* Card: Status & Assignment Timeline Audit Trail */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
              Audit History & State Transitions
            </h4>
            <Timeline
              statusHistory={complaint.statusHistory || []}
              assignmentHistory={complaint.assignmentHistory || []}
              escalationHistory={complaint.escalationHistory || []}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <StatusTransitionModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        currentStatus={complaint.status}
        complaintTitle={complaint.title}
        ticketNumber={complaint.ticketNumber}
        onTransition={handleTransition}
        userRole={user?.role}
      />

      <ReassignModal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        complaintId={complaint.id}
        currentAgentId={complaint.assignedAgentId}
        onReassigned={fetchComplaint}
      />

      <FeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        complaintId={complaint.id}
        ticketNumber={complaint.ticketNumber}
        onSubmitted={fetchComplaint}
      />
    </div>
  );
}
