import type { DailyBriefing, PapIntegrationStatus } from './types';

export type AlphaUser = {
  id: string;
  email: string;
  name: string;
  timeZone: string;
  createdAt: string;
};

export type AlphaConnectedAccount = {
  id: string;
  userId: string;
  provider: 'google';
  status: 'not_connected' | 'connected' | 'error';
  scopes: Array<'gmail.readonly' | 'calendar.readonly'>;
  connectedAt?: string;
  lastSyncedAt?: string;
};

export type AlphaBriefingRecord = {
  id: string;
  userId: string;
  briefing: DailyBriefing;
  source: PapIntegrationStatus['source'];
  createdAt: string;
};

export type AlphaActionRecord = {
  id: string;
  userId: string;
  briefingId: string;
  sourceActionId: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'edited' | 'undone';
  title: string;
  updatedAt: string;
};

export type AlphaAuditRecord = {
  id: string;
  userId: string;
  actionId: string;
  eventType: AlphaActionRecord['status'] | 'settings_changed' | 'sync_completed';
  title: string;
  createdAt: string;
};

export type AlphaWorkspaceSnapshot = {
  user: AlphaUser;
  connectedAccounts: AlphaConnectedAccount[];
  briefings: AlphaBriefingRecord[];
  actions: AlphaActionRecord[];
  auditRecords: AlphaAuditRecord[];
};

export function createAlphaActionRecords(params: {
  userId: string;
  briefingId: string;
  briefing: DailyBriefing;
  createdAt: string;
}): AlphaActionRecord[] {
  return params.briefing.pendingConfirmations.map((action) => ({
    id: `${params.briefingId}:${action.id}`,
    userId: params.userId,
    briefingId: params.briefingId,
    sourceActionId: action.id,
    status: 'pending',
    title: action.title,
    updatedAt: params.createdAt,
  }));
}

export function createAlphaAuditRecord(params: {
  userId: string;
  actionId: string;
  eventType: AlphaAuditRecord['eventType'];
  title: string;
  createdAt: string;
}): AlphaAuditRecord {
  return {
    id: `${params.createdAt}:${params.eventType}:${params.actionId}`,
    userId: params.userId,
    actionId: params.actionId,
    eventType: params.eventType,
    title: params.title,
    createdAt: params.createdAt,
  };
}
