import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm mb-4">
        <HelpCircle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900">404 — Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
        The page or resource you are looking for does not exist or may have been relocated.
      </p>
      <div className="mt-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
