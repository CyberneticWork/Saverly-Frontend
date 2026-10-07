import axios from 'axios';

const getBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || '').trim();

  // If running in browser on a live/remote domain, never attempt to call localhost
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ) {
    if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
      return '/api';
    }
  }

  if (!url) return '/api';

  url = url.replace(/\/+$/, '');
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }

  return url.endsWith('/api') ? url : `${url}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
});

const token = localStorage.getItem('adminToken');
if (token) api.defaults.headers.Authorization = `Bearer ${token}`;

export default api;
