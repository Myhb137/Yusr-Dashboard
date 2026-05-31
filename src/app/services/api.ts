import axios from 'axios';

// Create an Axios instance using the base URL from environment variables
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://travelapp-i9h9.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// You can add request interceptors here for adding auth tokens in the future
api.interceptors.request.use(
  (config) => {
    // Swagger bearerAuth uses JWT returned by auth endpoints.
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set multipart boundary (default JSON Content-Type breaks FormData).
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers && 'Content-Type' in config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`API Error [${status}]:`, data ? JSON.stringify(data, null, 2) : error.message);

    const isLoginRequest = error.config?.url?.includes('/login');
    if (status === 401 && !isLoginRequest) {
      // Unauthenticated — token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    // 403 = Forbidden (wrong role) — let it propagate so components can show a clear message
    return Promise.reject(error);
  }
);

export default api;
