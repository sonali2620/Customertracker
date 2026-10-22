import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, ArrowRight, Shield, User, Headphones, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Successfully logged in.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (roleType) => {
    setError('');
    setLoading(true);
    try {
      await demoLogin(roleType);
      toast.success(`Logged in as ${roleType} (Demo Account).`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Resolve<span className="text-indigo-600">IQ</span>
        </h2>
        <p className="mt-1.5 text-xs text-slate-500 font-medium">
          Intelligent Customer Complaint & Service Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80 space-y-6">
          {/* Quick Demo Login Panel */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/70 p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                1-Click Demo Login
              </span>
              <span className="text-[10px] text-slate-500">Live Seeded Accounts</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('MANAGER')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center shadow-2xs group"
              >
                <Shield className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-800">Manager</span>
                <span className="text-[9px] text-slate-400">Alexander S.</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('AGENT')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center shadow-2xs group"
              >
                <Headphones className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-800">Agent</span>
                <span className="text-[9px] text-slate-400">Sarah J.</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('CUSTOMER')}
                disabled={loading}
                className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center shadow-2xs group"
              >
                <User className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-slate-800">Customer</span>
                <span className="text-[9px] text-slate-400">John M.</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold tracking-wider">
                Or Sign In With Email
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/30 transition-all"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              New customer?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Register a new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
