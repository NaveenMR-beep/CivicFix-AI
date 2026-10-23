const API_BASE = 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('civicfix_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async register(data: { email: string; password: string; confirm_password?: string; full_name: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  // Dashboard
  async getDashboardSummary() {
    const res = await fetch(`${API_BASE}/dashboard/my-summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    return res.json();
  },

  // Complaints
  async listComplaints(params?: { category?: string; status?: string; priority_level?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.status) query.append('status', params.status);
    if (params?.priority_level) query.append('priority_level', params.priority_level);

    const res = await fetch(`${API_BASE}/complaints?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch complaints');
    return res.json();
  },

  async getMyComplaints() {
    const res = await fetch(`${API_BASE}/complaints/mine`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user complaints');
    return res.json();
  },

  async getComplaint(idOrTracking: string | number) {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(idOrTracking)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Complaint not found');
    }
    return res.json();
  },

  async getComplaintHistory(idOrTracking: string | number) {
    const res = await fetch(`${API_BASE}/complaints/${encodeURIComponent(idOrTracking)}/history`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not load complaint status history');
    }
    return res.json();
  },

  async trackComplaint(trackingNumber: string) {
    const res = await fetch(`${API_BASE}/complaints/track/${encodeURIComponent(trackingNumber)}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Complaint not found');
    }
    return res.json();
  },

  async getNearbyComplaints(lat: number, lon: number, radiusMeters = 3000, category?: string) {
    const query = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      radius_meters: radiusMeters.toString()
    });
    if (category) query.append('category', category);

    const res = await fetch(`${API_BASE}/complaints/nearby?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch nearby complaints');
    return res.json();
  },

  // Dedicated Secure Photo Upload
  async uploadPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image exceeds 5 MB limit. Please select a smaller photo.');
    }
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/complaints/upload-image`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Image upload failed');
    }
    return res.json();
  },

  async checkDuplicates(lat: number, lon: number, category: string, description = '') {
    const query = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      category,
      description
    });
    const res = await fetch(`${API_BASE}/complaints/check-duplicates?${query.toString()}`);
    if (!res.ok) throw new Error('Duplicate check failed');
    return res.json();
  },

  async createComplaint(data: any) {
    const res = await fetch(`${API_BASE}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    if (res.status === 409) {
      const conflictData = await res.json();
      const error: any = new Error(conflictData.detail?.message || 'Possible duplicate found');
      error.isDuplicate = true;
      error.detail = conflictData.detail;
      throw error;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit complaint');
    }
    return res.json();
  },

  async confirmComplaint(id: number, type = 'impacts_me', comment?: string) {
    const res = await fetch(`${API_BASE}/complaints/${id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ confirmation_type: type, comment })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Could not register confirmation');
    }
    return res.json();
  },

  // AI Service
  async analyzeImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/ai/analyze-image`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Image analysis failed');
    }
    return res.json();
  },

  // Staff Operations
  async getStaffComplaints(filters?: { status?: string; priority?: string; search?: string; assigned_to_me?: boolean }) {
    const query = new URLSearchParams();
    if (filters?.status) query.append('status', filters.status);
    if (filters?.priority) query.append('priority_level', filters.priority);
    if (filters?.search) query.append('search', filters.search);
    if (filters?.assigned_to_me) query.append('assigned_to_me', 'true');

    const res = await fetch(`${API_BASE}/staff/complaints?${query.toString()}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load staff tickets');
    return res.json();
  },

  async updateComplaintStatus(id: number, status: string, notes?: string) {
    const res = await fetch(`${API_BASE}/staff/complaints/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async uploadRepairEvidence(id: number, file: File, notes?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) formData.append('notes', notes);

    const res = await fetch(`${API_BASE}/staff/complaints/${id}/repair-evidence`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload repair evidence');
    return res.json();
  },

  async overridePriority(id: number, severity?: number, safety?: number, reason = 'Staff manual calibration') {
    const res = await fetch(`${API_BASE}/staff/complaints/${id}/priority-override`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ severity_score: severity, safety_risk_score: safety, reason })
    });
    if (!res.ok) throw new Error('Failed to override priority');
    return res.json();
  },

  // Admin & Analytics
  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE}/analytics/summary`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch analytics summary');
    return res.json();
  },

  async getCategoryDistribution() {
    const res = await fetch(`${API_BASE}/analytics/categories`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch category distribution');
    return res.json();
  },

  async getTrends() {
    const res = await fetch(`${API_BASE}/analytics/trends`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch trends');
    return res.json();
  },

  async getHotspots() {
    const res = await fetch(`${API_BASE}/analytics/hotspots`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch hotspots');
    return res.json();
  },

  async listDepartments() {
    const res = await fetch(`${API_BASE}/admin/departments`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load departments');
    return res.json();
  },

  async assignComplaint(id: number, departmentId?: number, staffId?: number, notes?: string) {
    const res = await fetch(`${API_BASE}/admin/complaints/${id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ department_id: departmentId, staff_id: staffId, notes })
    });
    if (!res.ok) throw new Error('Failed to assign ticket');
    return res.json();
  },

  async getPriorityConfig() {
    const res = await fetch(`${API_BASE}/admin/priority-config`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to get priority config');
    return res.json();
  },

  async updatePriorityConfig(config: { severity_weight: number; safety_risk_weight: number; community_impact_weight: number }) {
    const res = await fetch(`${API_BASE}/admin/priority-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update priority configuration');
    }
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  exportCsvUrl() {
    return `${API_BASE}/admin/export-csv`;
  }
};
