import axios from 'axios';
import type { AIBrief, Customer, ProductRecommendation } from '../src/types';

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

/**
 * Backend contract entry points. The UI remains on local mock data until
 * EXPO_PUBLIC_API_URL is supplied, so frontend work continues uninterrupted.
 */
export const customerApi = {
  getProfile: (customerId: string) => api.get<Customer>(`/customers/${customerId}`),
  getRecommendations: (customerId: string) =>
    api.get<ProductRecommendation[]>(`/customers/${customerId}/recommendations`),
};

export const caApi = {
  getTodayBrief: (customerId: string) =>
    api.get<AIBrief>(`/ca/customers/${customerId}/brief`),
  createConsultation: (customerId: string, content: string) =>
    api.post(`/ca/customers/${customerId}/consultations`, { content }),
  issueVisitStamp: (customerId: string, storeName: string) =>
    api.post(`/ca/customers/${customerId}/journey-stamps`, { type: 'visit', storeName }),
};
