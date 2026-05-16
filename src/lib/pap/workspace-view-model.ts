import type { ActionResult, AuditEvent } from '@/lib/pap/dashboard-state';
import type { AlphaWorkspaceResponse } from './alpha-client';
import type { DailyBriefing } from './types';

export type WorkspaceSyncState = 'loading' | 'ready' | 'failed';

export type PapWorkspaceViewModel = {
  local: {
    pendingCount: number;
    handledCount: number;
    meetingCount: number;
    auditCount: number;
  };
  alpha: {
    syncState: WorkspaceSyncState;
    pendingCount: number;
    auditCount: number;
    lastDecisionSync?: 'synced' | 'failed';
  };
};

export function createPapWorkspaceViewModel(params: {
  briefing: DailyBriefing;
  actionResults: ActionResult[];
  auditEvents: AuditEvent[];
  alphaWorkspace?: AlphaWorkspaceResponse;
  alphaError?: string;
  lastDecisionSync?: 'synced' | 'failed';
}): PapWorkspaceViewModel {
  const pendingCount = params.briefing.pendingConfirmations.filter(
    (action) => !params.actionResults.some((result) => result.id === action.id),
  ).length;
  const handledCount = params.briefing.automaticallyHandled.filter(
    (action) => !params.actionResults.some((result) => result.id === action.id && result.status === 'undone'),
  ).length;
  const meetingCount = params.briefing.meetingSuggestions.filter(
    (suggestion) => !params.actionResults.some((result) => result.id === `${suggestion.emailId}_slot`),
  ).length;
  const alphaActions = params.alphaWorkspace?.workspace.actions ?? [];
  const alphaAuditRecords = params.alphaWorkspace?.workspace.auditRecords ?? [];

  return {
    local: {
      pendingCount,
      handledCount,
      meetingCount,
      auditCount: params.auditEvents.length,
    },
    alpha: {
      syncState: params.alphaError ? 'failed' : params.alphaWorkspace ? 'ready' : 'loading',
      pendingCount: alphaActions.filter((action) => action.status === 'pending').length,
      auditCount: alphaAuditRecords.length,
      lastDecisionSync: params.lastDecisionSync,
    },
  };
}
