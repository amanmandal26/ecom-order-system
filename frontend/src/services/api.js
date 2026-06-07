import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Reads the access token from localStorage and attaches it to every request.
// The token is stored here (not in a cookie) for simplicity in a learning project.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh token machinery ───────────────────────────────────────────────────
//
// WHY failedQueue?
// When the access token expires, multiple requests may 401 at the same time
// (e.g., the page loads and fires 3 API calls in parallel — all 401).
// Without a queue, each of those would independently try to call /auth/refresh,
// causing a race condition: the FIRST refresh rotates the token (old token gone),
// the SECOND refresh tries to use the same old token → fails → user is logged out.
//
// The queue solves this:
//   1st 401 → starts the refresh, all others queue up
//   Refresh succeeds → drain the queue, retry all pending requests with new token
//   Refresh fails   → drain the queue with an error, clear auth, go to login
//
let isRefreshing  = false;
let failedQueue   = [];

function processQueue(error, token = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

// ── Response interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401 errors and only once per request (_retry guard prevents
    // infinite loops if the new token also returns 401 for some other reason).
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('refreshToken');

      // No refresh token in storage → nothing we can do → send to login
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Another refresh is already in flight → queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // This is the first 401 — kick off the refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use plain axios (not `api`) to avoid running through this interceptor again
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the default header so future requests automatically use the new token
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);   // retry the original failed request
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
