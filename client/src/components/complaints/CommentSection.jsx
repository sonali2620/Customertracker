import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { RoleBadge } from '../common/Badge';
import { Lock, Send, MessageSquare, AlertCircle } from 'lucide-react';

export function CommentSection({
  complaintId,
  comments = [],
  onCommentAdded,
  replyText = '',
  setReplyText
}) {
  const { user, isCustomer } = useAuth();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Local state for comment input if setReplyText not provided
  const [internalText, setInternalText] = useState('');
  const textValue = setReplyText ? replyText : internalText;
  const setTextValue = setReplyText ? setReplyText : setInternalText;

  const publicComments = comments.filter(c => !c.isInternal);
  const internalNotes = comments.filter(c => c.isInternal);

  const displayedComments =
    activeFilter === 'PUBLIC'
      ? publicComments
      : activeFilter === 'INTERNAL'
      ? internalNotes
      : comments;

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!textValue || !textValue.trim()) return;

    setError('');
    setSubmitting(true);
    try {
      await api.addComment(complaintId, {
        message: textValue.trim(),
        isInternal: isCustomer ? false : isInternal
      });
      setTextValue('');
      setIsInternal(false);
      onCommentAdded();
    } catch (err) {
      setError(err.message || 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter Tabs (Staff Only) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Discussion & Investigation Thread ({comments.length})
          </h3>
        </div>

        {!isCustomer && (
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({comments.length})
            </button>
            <button
              onClick={() => setActiveFilter('PUBLIC')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeFilter === 'PUBLIC'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Public ({publicComments.length})
            </button>
            <button
              onClick={() => setActiveFilter('INTERNAL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeFilter === 'INTERNAL'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Notes ({internalNotes.length})
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {displayedComments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-slate-100">
            No comments posted in this view.
          </div>
        ) : (
          displayedComments.map((comment) => {
            const isNote = comment.isInternal;

            return (
              <div
                key={comment.id}
                className={`p-4 rounded-xl border transition-all ${
                  isNote
                    ? 'bg-amber-50/60 border-amber-200/90 shadow-xs ring-1 ring-amber-400/20'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        isNote
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        {comment.user?.name || 'User'}
                      </span>
                      <div className="inline-block ml-2">
                        <RoleBadge role={comment.user?.role} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isNote && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                        <Lock className="w-3 h-3" />
                        Internal Staff Note
                      </span>
                    )}
                    <time className="text-[11px] text-slate-400">
                      {new Date(comment.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                </div>

                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed pl-9">
                  {comment.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Comment Submission Form */}
      <form onSubmit={handlePostComment} className="pt-2">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <textarea
            rows={4}
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder={
              isInternal
                ? 'Type private internal note (visible only to support agents and managers)...'
                : 'Write a public response to the customer...'
            }
            className="w-full p-3.5 text-xs text-slate-900 placeholder-slate-400 border-0 focus:outline-none resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-100">
            {!isCustomer ? (
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    isInternal ? 'text-amber-800' : 'text-slate-600'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  Mark as Internal Note (Confidential)
                </span>
              </label>
            ) : (
              <span className="text-[11px] text-slate-400">
                Your reply will be visible to our support team.
              </span>
            )}

            <button
              type="submit"
              disabled={submitting || !textValue.trim()}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all ${
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                  : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Posting...' : isInternal ? 'Post Staff Note' : 'Send Public Reply'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
