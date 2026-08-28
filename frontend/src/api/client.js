import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const API_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : '/api';
let csrfToken = null;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

// Attach the CSRF token (double-submit cookie pattern) to every
// state-changing request. The cookie is set by the backend on first
// contact and refreshed automatically as needed.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = csrfToken || getCookie('csrfToken');
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

export async function primeCsrf() {
  try {
    const { data } = await api.get('/health');
    csrfToken = data.csrfToken || null;
  } catch (err) {
    // ignore — health check failing here doesn't block the app
  }
}

export default api;
