import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =========================
// REQUEST INTERCEPTOR
// =========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    //  401 = Non authentifié → déconnexion
    if (error.response?.status === 401) {
      console.warn('Session expirée ou invalide.');

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      window.location.href = '/login';
    }

    //  403 = Authentifié mais pas autorisé → NE PAS déconnecter
    if (error.response?.status === 403) {
      console.warn('Accès refusé (403) - Permissions insuffisantes.');
    }

    return Promise.reject(error);
  }
);

// =========================
// AUTH API
// =========================
export const authAPI = {
  login: (identifier, password) => {
    // If identifier looks like an email, send as email, otherwise as matricule
    const payload = identifier && identifier.includes('@')
      ? { email: identifier, password }
      : { matricule: identifier, password };

    return api.post('/auth/login', payload);
  },

  me: () =>
    api.get('/auth/me'),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Erreur lors du logout backend');
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// =========================
// USERS API
// =========================
export const usersAPI = {
  list: (page = 1, limit = 10) =>
    api.get(`/users?page=${page}&limit=${limit}`),

  get: (id) =>
    api.get(`/users/${id}`),

  create: (data) =>
    api.post('/users', data),

  update: (id, data) =>
    api.put(`/users/${id}`, data),

  delete: (id) =>
    api.delete(`/users/${id}`),
};

// =========================
// POINTAGES API
// =========================
export const pointagesAPI = {
  myPointages: (page = 1, limit = 50) => api.get(`/pointages/my?page=${page}&limit=${limit}`),
  today: () => api.get('/pointages/today'),
  list: (page = 1) => api.get(`/pointages?page=${page}`),
  create: (data) => api.post('/pointages', data),
};

// =========================
// LEAVES API
// =========================
export const leavesAPI = {
  create: (data) => api.post('/leaves', data),
  list: () => api.get('/leaves'),
  approve: (id) => api.post(`/leaves/${id}/approve`),
  reject: (id) => api.post(`/leaves/${id}/reject`),
};

// =========================
// ROLES API
// =========================
export const rolesAPI = {
  list: () =>
    api.get('/roles'),

  create: (data) =>
    api.post('/roles', data),
};

export default api;
