import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Mail, Info, KeyRound } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Password Recovery
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Reset password instructions and demo mode configuration
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 space-y-6">
          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Info className="w-4 h-4" />
                  <span>Demonstration Environment Notice</span>
                </div>
                <p>
                  Because this local installation uses in-app notifications without an external SMTP gateway configured (such as Mailgun/SendGrid), password recovery emails are not dispatched.
                </p>
                <div className="bg-white/80 p-3 rounded-lg border border-amber-200 mt-2 space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-900">Preset Demo Credentials for Immediate Access:</p>
                  <p><span className="font-bold">Manager:</span> manager@resolveiq.com / Manager@123</p>
                  <p><span className="font-bold">Support Agent:</span> agent.sarah@resolveiq.com / Agent@123</p>
                  <p><span className="font-bold">Customer:</span> customer.john@example.com / Customer@123</p>
                </div>
              </div>

              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                Request Recovery Information
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
