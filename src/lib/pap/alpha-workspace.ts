import { runPapV1Pipeline } from './pipeline';
import {
  createAlphaActionRecords,
  createAlphaAuditRecord,
  type AlphaAuditRecord,
  type AlphaBriefingRecord,
  type AlphaConnectedAccount,
  type AlphaUser,
  type AlphaWorkspaceSnapshot,
} from './alpha-data-model';
import type { PapIntegrationStatus } from './types';

const alphaNow = '2026-05-04T12:00:00.000Z';
const alphaUser: AlphaUser = {
  id: 'user_alpha_1',
  email: 'founder@example.com',
  name: 'PAP Alpha User',
  timeZone: 'Europe/Berlin',
  createdAt: alphaNow,
};

export const alphaIntegrationStatus: PapIntegrationStatus = {
  source: 'demo_data',
  gmail: 'not_connected',
  calendar: 'not_connected',
  storage: 'browser_local',
  automationMode: 'confirmation_only',
};

const connectedAccounts: AlphaConnectedAccount[] = [
  {
    id: 'google_alpha_placeholder',
    userId: alphaUser.id,
    provider: 'google',
    status: 'not_connected',
    scopes: ['gmail.readonly', 'calendar.readonly'],
  },
];

let alphaWorkspaceStore: AlphaWorkspaceSnapshot | undefined;

function createInitialAlphaWorkspaceSnapshot(): AlphaWorkspaceSnapshot {
  const briefing = runPapV1Pipeline();
  const briefingRecord: AlphaBriefingRecord = {
    id: 'briefing_2026_05_04',
    userId: alphaUser.id,
    briefing,
    source: alphaIntegrationStatus.source,
    createdAt: alphaNow,
  };

  return {
    user: alphaUser,
    connectedAccounts,
    briefings: [briefingRecord],
    actions: createAlphaActionRecords({
      userId: alphaUser.id,
      briefingId: briefingRecord.id,
      briefing,
      createdAt: alphaNow,
    }),
    auditRecords: [],
  };
}

export function resetAlphaWorkspaceStore() {
  alphaWorkspaceStore = createInitialAlphaWorkspaceSnapshot();
  return alphaWorkspaceStore;
}

export function getAlphaWorkspaceSnapshot(): AlphaWorkspaceSnapshot {
  alphaWorkspaceStore ??= createInitialAlphaWorkspaceSnapshot();
  return alphaWorkspaceStore;
}

export function createAlphaWorkspaceSnapshot(): AlphaWorkspaceSnapshot {
  return getAlphaWorkspaceSnapshot();
}

export function createAlphaActionDecision(params: {
  actionId: string;
  decision: 'confirmed' | 'rejected';
  createdAt?: string;
}) {
  const workspace = getAlphaWorkspaceSnapshot();
  const action = workspace.actions.find((candidate) => candidate.id === params.actionId);

  if (!action) return null;

  const createdAt = params.createdAt ?? alphaNow;
  const updatedAction = { ...action, status: params.decision, updatedAt: createdAt };
  const auditRecord: AlphaAuditRecord = createAlphaAuditRecord({
    userId: action.userId,
    actionId: action.id,
    eventType: params.decision,
    title: action.title,
    createdAt,
  });

  alphaWorkspaceStore = {
    ...workspace,
    actions: workspace.actions.map((candidate) => (
      candidate.id === params.actionId ? updatedAction : candidate
    )),
    auditRecords: [...workspace.auditRecords, auditRecord],
  };

  return { action: updatedAction, auditRecord };
}
