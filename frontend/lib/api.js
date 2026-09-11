const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Get the auth token from localStorage
 */
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

/**
 * Core fetch wrapper with auth and error handling
 */
const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
  const data = await res.json();

  if (!data.success) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(data.message || 'API error');
  }

  return data;
};

// Auth
export const authAPI = {
  login: (body) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me'),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
};

// Cases
export const casesAPI = {
  list: (params = {}) => apiFetch(`/cases?${new URLSearchParams(params)}`),
  get: (id) => apiFetch(`/cases/${id}`),
  create: (body) => apiFetch('/cases', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => apiFetch(`/cases/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  stats: () => apiFetch('/cases/stats'),
  runRules: (id) => apiFetch(`/cases/${id}/rules`),
};

// Documents
export const documentsAPI = {
  upload: (caseId, formData) =>
    fetch(`${API_BASE}/documents/upload/${caseId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData, // FormData — no Content-Type header
      credentials: 'include',
    }).then((r) => r.json()),
  list: (caseId, party) =>
    apiFetch(`/documents/${caseId}${party ? `?party=${party}` : ''}`),
  get: (id) => apiFetch(`/documents/doc/${id}`),
  verify: (id) => apiFetch(`/documents/doc/${id}/verify`, { method: 'PUT' }),
  retryOCR: (id) => apiFetch(`/documents/doc/${id}/ocr`, { method: 'POST' }),
  // Lightweight OCR status poll — only returns status fields, no heavy OCR text
  ocrStatus: (caseId) => apiFetch(`/documents/${caseId}/ocr-status`),
  // Bull queue stats
  queueStats: () => apiFetch('/documents/queue/stats'),
};

// Legal Knowledge Base
export const legalAPI = {
  // Acts
  getActs: (params = {}) => apiFetch(`/legal/acts?${new URLSearchParams(params)}`),
  getAct: (id) => apiFetch(`/legal/acts/${id}`),
  createAct: (body) => apiFetch('/legal/acts', { method: 'POST', body: JSON.stringify(body) }),
  updateAct: (id, body) => apiFetch(`/legal/acts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Sections
  getSections: (actId, params = {}) => apiFetch(`/legal/acts/${actId}/sections?${new URLSearchParams(params)}`),
  createSection: (actId, body) => apiFetch(`/legal/acts/${actId}/sections`, { method: 'POST', body: JSON.stringify(body) }),
  updateSection: (id, body) => apiFetch(`/legal/sections/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // Rules
  getRules: (params = {}) => apiFetch(`/legal/rules?${new URLSearchParams(params)}`),
  createRule: (body) => apiFetch('/legal/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id, body) => apiFetch(`/legal/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  // RAG Search
  search: (q, params = {}) => apiFetch(`/legal/search?q=${encodeURIComponent(q)}&${new URLSearchParams(params)}`),
};

// AI Analysis
export const analysisAPI = {
  run: (caseId) => apiFetch(`/analysis/${caseId}/run`, { method: 'POST' }),
  get: (caseId) => apiFetch(`/analysis/${caseId}`),
  status: (caseId) => apiFetch(`/analysis/${caseId}/status`),
  verifyEvidence: (id, body) => apiFetch(`/analysis/evidence/${id}/verify`, { method: 'PUT', body: JSON.stringify(body) }),
  updateIssueNotes: (id, body) => apiFetch(`/analysis/issues/${id}/notes`, { method: 'PUT', body: JSON.stringify(body) }),
};

// Draft Orders & Approval Workflow
export const ordersAPI = {
  generate: (caseId) => apiFetch(`/orders/${caseId}/generate`, { method: 'POST' }),
  generateHindi: (caseId) => apiFetch(`/orders/${caseId}/generate-hindi`, { method: 'POST' }),
  list: (caseId) => apiFetch(`/orders/${caseId}`),
  get: (id) => apiFetch(`/orders/order/${id}`),
  update: (id, body) => apiFetch(`/orders/order/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submit: (id, body) => apiFetch(`/orders/order/${id}/submit`, { method: 'PUT', body: JSON.stringify(body) }),
  approve: (id, body) => apiFetch(`/orders/order/${id}/approve`, { method: 'PUT', body: JSON.stringify(body) }),
  reject: (id, body) => apiFetch(`/orders/order/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) }),
};


// Audit Log Viewer
export const auditAPI = {
  list: (params = {}) => apiFetch(`/audit?${new URLSearchParams(params)}`),
};

// OCR Workbench & Testing API
export const ocrAPI = {
  health: () => apiFetch('/ocr/health'),
  samples: () => apiFetch('/ocr/samples'),
  processUrl: (body) => apiFetch('/ocr/process', { method: 'POST', body: JSON.stringify(body) }),
  processFile: (formData) =>
    fetch(`${API_BASE}/ocr/process`, {
      method: 'POST',
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: formData,
      credentials: 'include',
    }).then((r) => r.json()),
  cleanText: (body) => apiFetch('/ocr/clean', { method: 'POST', body: JSON.stringify(body) }),
  extractEntities: (body) =>
    apiFetch('/ocr/extract-entities', { method: 'POST', body: JSON.stringify(body) }),
};

export default apiFetch;



