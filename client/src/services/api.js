// Dynamically resolve API URL for local dev and cloud production (e.g. Render)
const getBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api/v1';

  // Force HTTPS when app runs on HTTPS (prevents Mixed Content blocking)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
    envUrl = envUrl.replace('http://', 'https://');
  }

  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
};

const BASE_URL = getBaseUrl();

/**
 * Universal API Request Handler
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('resolveiq_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include' // include HTTP-only cookies
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const fullUrl = `${BASE_URL}${endpoint}`;
    const res = await fetch(fullUrl, config);

    // Handle CSV or Blob responses
    if (options.isBlob) {
      if (!res.ok) throw new Error('Failed to download file');
      return await res.blob();
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const error = new Error(data?.message || 'An error occurred while processing the request.');
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      const isRender = BASE_URL.includes('.onrender.com');
      const hint = isRender
        ? `Render free services sleep when inactive. Open your Render backend URL once in a new tab to wake it up (takes ~30s), or check that VITE_API_URL is correctly set on Vercel.`
        : `Unable to connect to backend at ${BASE_URL}. Ensure backend is active and CORS is permitted.`;
      console.error('[API Connection Error]:', hint, err);
      throw new Error(hint);
    }
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (userData) => request('/auth/register', { method: 'POST', body: userData }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  changePassword: (passwords) => request('/auth/change-password', { method: 'POST', body: passwords }),

  // Complaints
  getComplaints: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, val);
      }
    });
    return request(`/complaints?${searchParams.toString()}`);
  },
  getComplaint: (id) => request(`/complaints/${id}`),
  createComplaint: (complaintData) => request('/complaints', { method: 'POST', body: complaintData }),
  updateComplaint: (id, updateData) => request(`/complaints/${id}`, { method: 'PUT', body: updateData }),
  updateStatus: (id, statusData) => request(`/complaints/${id}/status`, { method: 'PATCH', body: statusData }),
  reopenComplaint: (id, reasonData) => request(`/complaints/${id}/reopen`, { method: 'POST', body: reasonData }),
  assignAgent: (id, assignmentData) => request(`/complaints/${id}/assign`, { method: 'PATCH', body: assignmentData }),

  // Comments
  getComments: (id) => request(`/complaints/${id}/comments`),
  addComment: (id, commentData) => request(`/complaints/${id}/comments`, { method: 'POST', body: commentData }),

  // Feedback
  submitFeedback: (id, feedbackData) => request(`/complaints/${id}/feedback`, { method: 'POST', body: feedbackData }),

  // Categories & Users
  getCategories: () => request('/users/categories'),
  getAgents: () => request('/users/agents'),
  getUsers: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/users?${searchParams.toString()}`);
  },
  createUser: (userData) => request('/users', { method: 'POST', body: userData }),
  updateUser: (id, userData) => request(`/users/${id}`, { method: 'PUT', body: userData }),

  // SLA
  getSLAPolicies: () => request('/sla/policies'),
  updateSLAPolicy: (priority, policyData) => request(`/sla/policies/${priority}`, { method: 'PUT', body: policyData }),
  triggerSLACheck: () => request('/sla/check', { method: 'POST' }),
  getEscalations: () => request('/sla/escalations'),

  // Analytics & Export
  getDashboardMetrics: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/analytics/dashboard?${searchParams.toString()}`);
  },
  exportCSV: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/analytics/export-csv?${searchParams.toString()}`, { isBlob: true });
  },

  // Notifications
  getNotifications: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    return request(`/notifications?${searchParams.toString()}`);
  },
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),

  // AI Assistant (Advisory)
  aiClassify: (draftData) => request('/ai/classify', { method: 'POST', body: draftData }),
  aiSummarize: (id) => request(`/ai/summarize/${id}`),
  aiDraftResponse: (id, intention) => request(`/ai/draft-response/${id}`, { method: 'POST', body: { intention } })
};
