import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'ansd.token';
const USER_KEY = 'ansd.user';

export const AUTH_EXPIRED_EVENT = 'ansd:auth-expired';
export const PASSWORD_CHANGE_REQUIRED_EVENT = 'ansd:password-change-required';

/* Stockage de session : tolérant aux navigateurs qui bloquent le stockage. */
export const session = {
  getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  },
  save(token, user) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* stockage indisponible : la session durera le temps de la page */ }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* rien à faire */ }
  },
};

const http = axios.create({ baseURL: API_URL, timeout: 20000 });

http.interceptors.request.use((config) => {
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response.data?.mustChangePassword) {
      const user = session.getUser();
      if (user) {
        session.save(session.getToken(), { ...user, mustChangePassword: true });
        window.dispatchEvent(new Event(PASSWORD_CHANGE_REQUIRED_EVENT));
      }
    }
    // Un 401 sur la connexion = mauvais identifiants, pas une session expirée.
    const isLogin = (error.config?.url || '').includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      session.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

/** Message lisible pour l'utilisateur à partir d'une erreur axios. */
export function errorMessage(error, fallback = 'Une erreur est survenue. Réessayez.') {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.errors) {
    const e = error.response.data.errors;
    return Array.isArray(e) ? e.join(' ') : Object.values(e).join(' ');
  }
  if (error?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre.';
  if (!error?.response) return 'Serveur injoignable. Vérifiez votre connexion.';
  return fallback;
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data);
const post = (url, body) => http.post(url, body).then((r) => r.data);
const put = (url, body) => http.put(url, body).then((r) => r.data);
const del = (url) => http.delete(url).then((r) => r.data);

export const authApi = {
  login: (identifier, password) => {
    const body = identifier.includes('@')
      ? { email: identifier, password }
      : { matricule: identifier, password };
    return post('/auth/login', body);
  },
  me: () => get('/auth/me'),
  logout: () => post('/auth/logout'),
  changePassword: (newPassword, confirmPassword) => post('/auth/change-password', { newPassword, confirmPassword }),
};

export const usersApi = {
  list: (params) => get('/users', params),
  agents: (params) => get('/users/agents', params),
  supervisors: () => get('/users/supervisors'),
  create: (body) => post('/users', body),
  update: (id, body) => put(`/users/${id}`, body),
  remove: (id) => del(`/users/${id}`),
};

export const rolesApi = {
  list: () => get('/roles'),
  create: (body) => post('/roles', body),
  update: (id, body) => put(`/roles/${id}`, body),
  remove: (id) => del(`/roles/${id}`),
  setPermissions: (id, permissionIds) => put(`/roles/${id}/permissions`, { permissionIds }),
};

export const permissionsApi = {
  list: () => get('/permissions'),
};

export const pointagesApi = {
  list: (params) => get('/pointages', params),
  today: (params) => get('/pointages/today', params),
  mine: (params) => get('/pointages/my', params),
  myDays: (month) => get('/pointages/my/days', { month }),
  check: (matricule) => get(`/pointages/check/${encodeURIComponent(matricule)}`),
  create: (body) => post('/pointages', body),
  remove: (id) => del(`/pointages/${id}`),
};

export const leavesApi = {
  list: (params) => get('/leaves', params),
  create: (body) => post('/leaves', body),
  approve: (id) => post(`/leaves/${id}/approve`),
  reject: (id) => post(`/leaves/${id}/reject`),
  cancel: (id) => post(`/leaves/${id}/cancel`),
};

export const reportsApi = {
  pointages: (params) => get('/reports/pointages', params),
  daily: (params) => get('/reports/daily', params),
  attendance: (params) => get('/reports/attendance', params),
  anomalies: (params) => get('/reports/anomalies', params),
};

export const statsApi = {
  summary: (params) => get('/statistics/summary', params),
  hourly: (params) => get('/statistics/hourly-distribution', params),
  trend: (params) => get('/statistics/daily-trend', params),
  agentAttendance: (params) => get('/statistics/agent-attendance', params),
};

export const servicesApi = {
  list: () => get('/services'),
  show: (id) => get(`/services/${id}`),
  create: (body) => post('/services', body),
  update: (id, body) => put(`/services/${id}`, body),
  setMembers: (id, userIds) => put(`/services/${id}/members`, { userIds }),
  remove: (id) => del(`/services/${id}`),
};

export const badgesApi = {
  list: (params) => get('/badge-codes', params),
  create: (body) => post('/badge-codes', body),
  remove: (id) => del(`/badge-codes/${id}`),
};
