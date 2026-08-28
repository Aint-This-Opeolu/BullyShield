import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const API_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : '/api';
let csrfToken = sessionStorage.getItem('csrfToken');

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
    const { data } = await api.get('/health', {
      params: { csrf: Date.now() },
    });
    csrfToken = data.csrfToken || null;
    if (csrfToken) {
      sessionStorage.setItem('csrfToken', csrfToken);
      api.defaults.headers.common['X-CSRF-Token'] = csrfToken;
    }
    return csrfToken;
  } catch (err) {
    return null;
  }
}

api.interceptors.response.use(null, async (error) => {
  const request = error.config;
  if (
    error.response?.status === 403 &&
    request &&
    !request._csrfRetry &&
    !request.url?.endsWith('/health')
  ) {
    request._csrfRetry = true;
    await primeCsrf();
    return api(request);
  }
  return Promise.reject(error);
});

export default api;
