import React, { useState } from 'react';
import { api } from '../../services/api';
import { Sparkles, FileText, Send, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';

export function AIAssistantDrawer({ complaintId, onApplyDraft }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [summaryData, setSummaryData] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [draftIntention, setDraftIntention] = useState('ACKNOWLEDGEMENT');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Fetch thread summary
  const fetchSummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const res = await api.aiSummarize(complaintId);
      if (res?.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Generate response draft
  const generateDraft = async (intention = draftIntention) => {
    setLoadingDraft(true);
    setError('');
    try {
      const res = await api.aiDraftResponse(complaintId, intention);
      if (res?.data) {
        setDraftData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to draft response.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-white rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              ResolveIQ Copilot
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold uppercase">
                Advisory
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">AI-assisted thread analysis & drafts</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => {
              setActiveTab('summary');
              if (!summaryData) fetchSummary();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Thread Summary
          </button>
          <button
            onClick={() => {
              setActiveTab('draft');
              if (!draftData) generateDraft();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'draft'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Draft Response
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Thread Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-3">
          {!summaryData && !loadingSummary && (
            <div className="text-center py-6">
              <p className="text-xs text-slate-600 mb-3">
                Generate an advisory executive summary of the entire complaint and conversation history.
              </p>
              <button
                onClick={fetchSummary}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Thread Summary
              </button>
            </div>
          )}

          {loadingSummary && (
            <div className="flex items-center justify-center py-8 space-x-2 text-xs text-indigo-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing complaint activity and generating summary...</span>
            </div>
          )}

          {summaryData && !loadingSummary && (
            <div className="space-y-3">
              <div className="bg-white/90 p-4 rounded-xl border border-indigo-100 text-xs text-slate-800 space-y-2 leading-relaxed">
                <div className="font-semibold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Executive Key Points</span>
                  <button
                    onClick={fetchSummary}
                    title="Regenerate"
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                  {summaryData.keyPoints?.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                * Note: Advisory summary generated for quick agent review. Verify all details against primary ticket records.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Draft Response */}
      {activeTab === 'draft' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Select Reply Objective:</span>
            <select
              value={draftIntention}
              onChange={(e) => {
                setDraftIntention(e.target.value);
                generateDraft(e.target.value);
              }}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ACKNOWLEDGEMENT">Acknowledgement & Investigation</option>
              <option value="INFORMATION_REQUEST">Request Additional Information</option>
              <option value="RESOLUTION">Resolution Confirmation Notice</option>
            </select>
          </div>

          {loadingDraft && (
            <div className="flex items-center justify-center py-8 space-x-2 text-xs text-indigo-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Drafting polite response...</span>
            </div>
          )}

          {!draftData && !loadingDraft && (
            <div className="text-center py-6">
              <button
                onClick={() => generateDraft()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Polite Draft
              </button>
            </div>
          )}

          {draftData && !loadingDraft && (
            <div className="space-y-3">
              <div className="relative bg-white/90 p-4 rounded-xl border border-indigo-100">
                <textarea
                  readOnly
                  rows={7}
                  value={draftData.draftResponse}
                  className="w-full text-xs text-slate-800 bg-transparent resize-none focus:outline-none leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                  <span className="text-[10px] text-slate-400 italic">
                    Human agents must review before sending.
                  </span>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleCopy(draftData.draftResponse)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    {onApplyDraft && (
                      <button
                        onClick={() => onApplyDraft(draftData.draftResponse)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Insert into Reply Box</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
