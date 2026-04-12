const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin';
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'how_to' | 'general';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_client' | 'resolved' | 'closed' | 'reopened';
export type SenderType = 'client' | 'Superadmin' | 'admin';

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: SenderType;
  sender_id: string;
  sender_name: string;
  content: string;
  attachment_url?: string;
  is_internal: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  org_id: string;
  category: TicketCategory;
  priority: TicketPriority;
   org_name?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

export interface AdminDashboardData {
  users: {
    total: number;
    by_role: Record<string, number>;
  };
  organizations: {
    total: number;
  };
  helpdesk: {
    total: number;
    by_status: Record<string, number>;
    trends: Array<{ date: string; opened: number; resolved: number }>;
  };
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('arthax_admin_token');
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch { }
    throw { detail, status: res.status } as ApiError;
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: buildHeaders() });
    return handleResponse<T>(res);
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST', headers: buildHeaders(), body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT', headers: buildHeaders(), body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res);
  }
};

// ─── Endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  adminLogin: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/api/admin/auth/login', { email, password }),
  logout: () => apiClient.post<{message: string}>('/api/admin/auth/logout'),
};

export const adminSupportApi = {
  list: () => 
    apiClient.get<SupportTicket[]>('/api/admin/support/tickets'),
  getMessages: (id: string) => 
    apiClient.get<SupportMessage[]>(`/api/admin/support/tickets/${id}/messages`),
  updateStatus: (id: string, status: TicketStatus) => 
    apiClient.put<{ message: string }>(`/api/admin/support/tickets/${id}/status`, { status }),
  reply: (id: string, data: { content: string; is_internal: boolean }) => 
    apiClient.post<SupportMessage>(`/api/admin/support/tickets/${id}/messages`, data),
};

export const adminClientsApi = {
  list: () => apiClient.get<any[]>('/api/admin/clients/onboarded'),
  onboard: (data: any) => apiClient.post<any>('/api/admin/clients/onboard', data),
};

export const adminAnalyticsApi = {
  getDashboard: () => apiClient.get<AdminDashboardData>('/api/admin/analytics/dashboard'),
};