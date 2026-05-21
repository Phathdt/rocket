import axios from 'axios';

// Traefik edge proxy on :80 is the single entry point (REST + WebSocket).
const BASE_URL = import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
