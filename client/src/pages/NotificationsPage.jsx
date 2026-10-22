import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Bell, CheckCircle2, Clock, Check, ArrowRight, ShieldAlert } from 'lucide-react';

export function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications({
        unreadOnly: unreadOnly ? 'true' : 'false',
        limit: 50
      });
      if (res?.data) {
        setNotifications(res.data);
      }
    } catch (e) {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id, complaintId) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      if (complaintId) {
        navigate(`/complaints/${complaintId}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read.');
    } catch (e) {
      toast.error('Failed to update notifications.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Activity & Ticket Notifications
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            System dispatch alerts, ticket assignments, status updates, and public replies.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              unreadOnly ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-xl font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No notifications available in this view.
          </div>
        ) : (
          notifications.map((n) => {
            const isEscalation = n.type === 'ESCALATION';

            return (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id, n.complaintId)}
                className={`p-4 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                  !n.isRead ? 'bg-indigo-50/30' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isEscalation
                        ? 'bg-rose-100 text-rose-600'
                        : !n.isRead
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isEscalation ? <ShieldAlert className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {n.complaintId && (
                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:underline">
                      View Ticket <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
