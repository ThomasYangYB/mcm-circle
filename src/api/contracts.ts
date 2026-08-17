/** Backend handoff API contract (frontend-api-spec.html). */
export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };
export type PageEnvelope<T> = ApiEnvelope<{ items: T[]; page: number; size: number; totalElements: number; totalPages: number; hasNext: boolean }>;
export type AuthTokens = { accessToken: string; refreshToken?: string };
export type CustomerProfileResponse = { customerId: string; customerNo: string; customerName: string; phoneNumber?: string; qrToken: string; membershipGrade?: string; joinedAt?: string; profileImageUrl?: string };
export type CustomerSearchItem = { customerId: string; customerNo: string; customerName: string; phoneNumber?: string; membershipGrade?: string };
export type VisitResponse = { visitId: number; customerId: string; customerName: string; storeId: string; storeName: string; visitedAt: string };
/** Server request names are deliberately separate from local UI field names. */
export type ConsultationRecordRequest = {
  visitPurpose: string;
  content: string;
  styleChangeNote?: string;
  cautionNote?: string;
  consentConfirmed: boolean;
};
export type ConsultationRecordResponse = ConsultationRecordRequest & {
  visitRecordId: number;
  visitId: number;
  customerName: string;
  caName: string;
  storeName: string;
  createdAt: string;
};
export type StampResponse = { stampId: number; visitId: number; storeName: string; issuedAt: string; stampImageUrl?: string };
export type AIBriefResponse = { briefId: number; visitId: number; summary: string; suggestedApproach: string; basis: string[]; cautions: string[]; recommendations: Array<{ productCode: string; reason: string }>; generatedAt: string };
