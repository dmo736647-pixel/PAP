import type { AlphaActionRecord, AlphaAuditRecord, AlphaWorkspaceSnapshot } from './alpha-data-model';
import type { GoogleConnectionState } from './private-alpha-types';
import type { PapIntegrationStatus } from './types';

export type AlphaReadinessResponse = {
  status: PapIntegrationStatus;
  readOnlyFirst: boolean;
  liveActionsEnabled: boolean;
};

export type AlphaWorkspaceResponse = {
  integrationStatus: PapIntegrationStatus;
  workspace: AlphaWorkspaceSnapshot;
};

export type AlphaActionDecisionResponse = {
  action: AlphaActionRecord;
  auditRecord: AlphaAuditRecord;
};

export type GoogleSyncStatusResponse = {
  state: GoogleConnectionState;
  hasWorkspace: boolean;
};

export type GoogleSyncResponse =
  | { status: 'succeeded'; gmailMessageCount: number; calendarEventCount: number }
  | { status: 'failed'; errorMessage: string };

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);

  if (!response.ok) {
    throw new Error(`Alpha API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchAlphaReadiness() {
  return fetchJson<AlphaReadinessResponse>('/api/alpha/readiness');
}

export function fetchAlphaWorkspace() {
  return fetchJson<AlphaWorkspaceResponse>('/api/alpha/workspace');
}

export function confirmAlphaAction(id: string) {
  return fetchJson<AlphaActionDecisionResponse>(`/api/alpha/actions/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
  });
}

export function rejectAlphaAction(id: string) {
  return fetchJson<AlphaActionDecisionResponse>(`/api/alpha/actions/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
  });
}

export function fetchGoogleSyncStatus() {
  return fetchJson<GoogleSyncStatusResponse>('/api/google/sync/status');
}

export function runGoogleSync() {
  return fetchJson<GoogleSyncResponse>('/api/google/sync', {
    method: 'POST',
  });
}

export function logoutPapSession() {
  return fetchJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  });
}

export type SendReplyResponse =
  | { ok: true; messageId: string }
  | { error: string };

export function sendMeetingReply(input: {
  threadId: string;
  to: string;
  subject: string;
  body: string;
}) {
  return fetchJson<SendReplyResponse>('/api/google/send-reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}
