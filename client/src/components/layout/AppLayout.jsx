import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { RoleBadge } from '../common/Badge';
import {
  LayoutDashboard,
  Inbox,
  UserCheck,
  PlusCircle,
  ShieldAlert,
  Users,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export function AppLayout() {
  const { user, logout, isManager, isAgent, isCustomer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications({ limit: 5 });
      if (res?.data) {
        setRecentNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setRecentNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  // Dynamic Navigation Items Scoped to User Role
  const navItems = [
    {
      to: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    },
    {
      to: '/complaints',
      label: isCustomer ? 'My Complaints' : 'All Complaints',
      icon: Inbox,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    },
    {
      to: '/my-tickets',
      label: 'My Assigned Tickets',
      icon: UserCheck,
      roles: ['AGENT']
    },
    {
      to: '/complaints/new',
      label: 'Create Complaint',
      icon: PlusCircle,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    },
    {
      to: '/sla-monitoring',
      label: 'SLA & Escalations',
      icon: ShieldAlert,
      roles: ['AGENT', 'MANAGER']
    },
    {
      to: '/users',
      label: 'Customers & Users',
      icon: Users,
      roles: ['MANAGER']
    },
    {
      to: '/analytics',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      roles: ['CUSTOMER', 'AGENT', 'MANAGER']
    }
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

  // Determine current Page Title & Breadcrumb
  const currentNav = navItems.find(item => item.to === location.pathname);
  let pageTitle = currentNav?.label || 'Overview';
  if (location.pathname.startsWith('/complaints/RIQ-') || (location.pathname.startsWith('/complaints/') && location.pathname !== '/complaints/new')) {
    pageTitle = 'Complaint Details';
  } else if (location.pathname === '/complaints/new') {
    pageTitle = 'Register New Complaint';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Resolve<span className="text-indigo-400">IQ</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">
                  Service Suite
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Management
            </div>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-rose-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout in Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
            <RoleBadge role={user?.role} />
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          {/* Left: Mobile hamburger & Breadcrumb */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <nav className="flex items-center text-xs text-slate-400 space-x-1.5 font-medium">
                <Link to="/dashboard" className="hover:text-slate-600">ResolveIQ</Link>
                <span>/</span>
                <span className="text-slate-700 capitalize">{pageTitle}</span>
              </nav>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right: Global Search, Notifications, Profile Menu */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="hidden md:block relative w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, keyword, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </form>

            {/* In-App Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                    <span className="text-sm font-bold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {recentNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No recent notifications.
                      </div>
                    ) : (
                      recentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            if (notif.complaintId) {
                              navigate(`/complaints/${notif.complaintId}`);
                            }
                            setNotificationsOpen(false);
                          }}
                          className={`p-3 text-left hover:bg-slate-50 cursor-pointer transition-colors ${
                            !notif.isRead ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                          <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-100 px-4 py-2 text-center bg-slate-50/50">
                    <Link
                      to="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      View all notifications &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="text-xs font-semibold text-slate-900 block leading-tight truncate max-w-[120px]">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5">
                      <RoleBadge role={user?.role} />
                    </div>
                  </div>

                  <Link
                    to="/settings"
                    className="flex items-center space-x-2 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Account Settings</span>
                  </Link>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={logout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
