import axios from 'axios';

// Replace this address when the backend is ready. The demo keeps local mock data
// until a backend is connected.
export const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  response => response,
  error => Promise.reject(error),
);
