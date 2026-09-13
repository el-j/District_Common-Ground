import { request } from '../client';
import type { MinigameManifest } from '@district-cg/shared-types';

export interface VerificationRequestPayload {
  sourceKind: 'url' | 'file';
  manifestUrl?: string;
  bundleSha256: string;
  pluginMetadata: MinigameManifest;
}

export interface VerificationRequestRecord {
  id: string;
  pluginId: string;
  requesterUserId: string;
  sourceKind: 'url' | 'file';
  manifestUrl?: string;
  bundleSha256: string;
  pluginMetadata: MinigameManifest;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function submitVerificationRequest(payload: VerificationRequestPayload): Promise<VerificationRequestRecord> {
  return request<VerificationRequestRecord>('POST', '/api/v1/plugins/verification-requests', payload, getAuthToken());
}

export function listVerificationRequests(): Promise<VerificationRequestRecord[]> {
  return request<VerificationRequestRecord[]>('GET', '/api/v1/plugins/verification-requests', undefined, getAuthToken());
}

export function reviewVerificationRequest(id: string, approved: boolean, notes = ''): Promise<void> {
  return request<void>('POST', `/api/v1/plugins/verification-requests/${id}/review`, { approved, notes }, getAuthToken());
}

function getAuthToken(): string | undefined {
  try {
    return localStorage.getItem('dcg-token') ?? undefined;
  } catch {
    return undefined;
  }
}
