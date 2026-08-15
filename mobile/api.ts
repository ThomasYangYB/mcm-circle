import axios from 'axios';
import type { AIBrief, ConsultationNote, Customer, ProductRecommendation } from '../src/types';

// Replace this address when the backend is ready. The demo keeps local mock data
// until a backend is connected.
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

export const hasConnectedBackend = () =>
  !api.defaults.baseURL?.includes('api.example.com');

export type ConsultationDraft = Pick<
  ConsultationNote,
  'visitPurpose' | 'content' | 'styleChange' | 'cautionUpdate' | 'consentConfirmed'
> & { storeName: string; caName: string };

export type AIInsightResponse = {
  brief: AIBrief;
  recommendations: ProductRecommendation[];
};

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
  createConsultation: (customerId: string, draft: ConsultationDraft) =>
    api.post<ConsultationNote>(`/ca/customers/${customerId}/consultations`, draft),
  // The backend/LLM can use every saved consultation plus the existing journey.
  // The returned recommendations are also intended for the customer recommendation tab.
  regenerateCustomerInsights: (customerId: string) =>
    api.post<AIInsightResponse>(`/ca/customers/${customerId}/ai-insights/regenerate`),
  issueVisitStamp: (customerId: string, storeName: string) =>
    api.post(`/ca/customers/${customerId}/journey-stamps`, { type: 'visit', storeName }),
};
