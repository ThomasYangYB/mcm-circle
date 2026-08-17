import axios from 'axios';
import type { AIBrief, ConsultationNote, ProductRecommendation } from '../src/types';
import type { AIBriefResponse, ApiEnvelope, AuthTokens, ConsultationRecordRequest, ConsultationRecordResponse, CustomerProfileResponse, CustomerSearchItem, PageEnvelope, StampResponse, VisitResponse } from '../src/api/contracts';

const FALLBACK_API_URL = 'https://api.example.com';
export const api = axios.create({ baseURL: process.env.EXPO_PUBLIC_API_URL ?? FALLBACK_API_URL, timeout: 10_000, headers: { 'Content-Type': 'application/json' } });
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const hasConnectedBackend = () => !api.defaults.baseURL?.includes('api.example.com');
api.interceptors.request.use((config) => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config; });
const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => { if (!response.data.success) throw new Error(response.data.message ?? '요청 처리에 실패했습니다.'); return response.data.data; };

export type ConsultationDraft = Pick<ConsultationNote, 'visitPurpose' | 'content' | 'styleChange' | 'cautionUpdate' | 'consentConfirmed'> & { storeName: string; caName: string };
export type AIInsightResponse = { brief: AIBrief; recommendations: ProductRecommendation[] };

// The server owns a visit. Keeping the id here ensures a consultation, stamp,
// and AI brief generated during one CA session are connected to that same visit.
const activeVisitIds = new Map<string, number>();

const toBrief = (customerId: string, response: AIBriefResponse): AIBrief => ({
  customerId,
  summary: response.summary,
  suggestedApproach: response.suggestedApproach ?? response.summary,
  basis: response.basis ?? [],
  generatedAt: response.generatedAt,
  dataSource: ['Visit', 'VisitRecord', 'Stamp', 'AI Brief API'],
  cautions: response.cautions ?? [],
  mode: 'LIVE AI',
});

const ensureActiveVisit = async (customerId: string) => {
  const inMemoryVisit = activeVisitIds.get(customerId);
  if (inMemoryVisit) return inMemoryVisit;

  const visits = await visitApi.listForCustomer(customerId);
  const latestVisit = visits.items[0];
  if (latestVisit?.visitId) {
    activeVisitIds.set(customerId, latestVisit.visitId);
    return latestVisit.visitId;
  }

  const createdVisit = await visitApi.create(customerId);
  activeVisitIds.set(customerId, createdVisit.visitId);
  return createdVisit.visitId;
};

// 로그인 응답을 받아 토큰만 설정한다. 화면 상태/저장은 Provider가 맡는다.
export const authApi = {
  customerSignup: (payload: Record<string, unknown>) => api.post<ApiEnvelope<CustomerProfileResponse>>('/api/v1/auth/customers/signup', payload).then(unwrap),
  customerLogin: async (emailOrPhone: string, password: string) => {
    const tokens = await api.post<ApiEnvelope<AuthTokens>>('/api/v1/auth/customers/login', { emailOrPhone, password }).then(unwrap);
    setAccessToken(tokens.accessToken);
    return tokens;
  },
  employeeLogin: async (loginId: string, password: string) => {
    const tokens = await api.post<ApiEnvelope<AuthTokens>>('/api/v1/auth/employees/login', { loginId, password }).then(unwrap);
    setAccessToken(tokens.accessToken);
    return tokens;
  },
};

export const customerApi = {
  me: () => api.get<ApiEnvelope<CustomerProfileResponse>>('/api/v1/customers/me').then(unwrap),
  updateMe: (payload: Partial<Pick<CustomerProfileResponse, 'customerName' | 'phoneNumber' | 'profileImageUrl'>>) => api.patch<ApiEnvelope<CustomerProfileResponse>>('/api/v1/customers/me', payload).then(unwrap),
  getById: (customerId: string) => api.get<ApiEnvelope<CustomerProfileResponse>>(`/api/v1/customers/${customerId}`).then(unwrap),
  getByQr: (qrToken: string) => api.get<ApiEnvelope<CustomerProfileResponse>>(`/api/v1/customers/by-qr/${qrToken}`).then(unwrap),
  search: (keyword: string, page = 0, size = 20) => api.get<PageEnvelope<CustomerSearchItem>>('/api/v1/customers/search', { params: { keyword, page, size } }).then(unwrap),
};

export const visitApi = {
  // storeId/CA는 employee JWT에서 판별한다. 프론트는 임의 지점을 전송하지 않는다.
  create: (customerId: string, visitedAt?: string) => api.post<ApiEnvelope<VisitResponse>>('/api/v1/visits', { customerId, visitedAt }).then(unwrap),
  get: (visitId: number) => api.get<ApiEnvelope<VisitResponse>>(`/api/v1/visits/${visitId}`).then(unwrap),
  listForCustomer: (customerId: string, page = 0, size = 20) => api.get<PageEnvelope<VisitResponse>>(`/api/v1/customers/${customerId}/visits`, { params: { page, size } }).then(unwrap),
  createRecord: (visitId: number, payload: ConsultationRecordRequest) => api.post<ApiEnvelope<ConsultationRecordResponse>>(`/api/v1/visits/${visitId}/records`, payload).then(unwrap),
  records: (visitId: number) => api.get<PageEnvelope<ConsultationRecordResponse>>(`/api/v1/visits/${visitId}/records`).then(unwrap),
  issueStamp: (visitId: number) => api.post<ApiEnvelope<StampResponse>>(`/api/v1/visits/${visitId}/stamps`).then(unwrap),
  customerStamps: () => api.get<PageEnvelope<StampResponse>>('/api/v1/customers/me/stamps').then(unwrap),
};

export const aiBriefApi = {
  generate: (customerId: string, visitId: number) => api.post<ApiEnvelope<AIBriefResponse>>(`/api/v1/customers/${customerId}/ai-briefs`, { visitId }).then(unwrap),
  latest: (customerId: string, visitId: number) => api.get<ApiEnvelope<AIBriefResponse>>(`/api/v1/customers/${customerId}/ai-briefs/latest`, { params: { visitId } }).then(unwrap),
  history: (customerId: string, page = 0, size = 20) => api.get<PageEnvelope<AIBriefResponse>>(`/api/v1/customers/${customerId}/ai-briefs`, { params: { page, size } }).then(unwrap),
};

export const caApi = {
  getTodayBrief: async (customerId: string) => {
    const visitId = await ensureActiveVisit(customerId);
    return toBrief(customerId, await aiBriefApi.latest(customerId, visitId));
  },
  createConsultation: async (customerId: string, draft: ConsultationDraft) => {
    const visitId = await ensureActiveVisit(customerId);
    return visitApi.createRecord(visitId, {
      visitPurpose: draft.visitPurpose,
      content: draft.content,
      styleChangeNote: draft.styleChange || undefined,
      cautionNote: draft.cautionUpdate || undefined,
      consentConfirmed: draft.consentConfirmed,
    });
  },
  regenerateCustomerInsights: async (customerId: string): Promise<AIInsightResponse> => {
    const visitId = await ensureActiveVisit(customerId);
    const response = await aiBriefApi.generate(customerId, visitId);
    return { brief: toBrief(customerId, response), recommendations: [] };
  },
  issueVisitStamp: async (customerId: string, _storeName: string) => {
    const visitId = await ensureActiveVisit(customerId);
    return visitApi.issueStamp(visitId);
  },
};
