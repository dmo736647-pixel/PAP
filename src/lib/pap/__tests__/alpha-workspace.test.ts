import { beforeEach, describe, expect, it } from 'vitest';
import {
  alphaIntegrationStatus,
  createAlphaActionDecision,
  getAlphaWorkspaceSnapshot,
  resetAlphaWorkspaceStore,
} from '../alpha-workspace';

describe('alpha workspace', () => {
  beforeEach(() => {
    resetAlphaWorkspaceStore();
  });

  it('creates a private alpha workspace from the demo pipeline', () => {
    const workspace = getAlphaWorkspaceSnapshot();

    expect(alphaIntegrationStatus).toMatchObject({
      source: 'demo_data',
      gmail: 'not_connected',
      calendar: 'not_connected',
      storage: 'browser_local',
      automationMode: 'confirmation_only',
    });
    expect(workspace.user.id).toBe('user_alpha_1');
    expect(workspace.connectedAccounts[0]).toMatchObject({
      provider: 'google',
      status: 'not_connected',
      scopes: ['gmail.readonly', 'calendar.readonly'],
    });
    expect(workspace.briefings).toHaveLength(1);
    expect(workspace.actions.length).toBeGreaterThan(0);
    expect(workspace.actions.every((action) => action.status === 'pending')).toBe(true);
  });

  it('persists action decisions and audit records in the memory store', () => {
    const actionId = getAlphaWorkspaceSnapshot().actions[0].id;

    expect(createAlphaActionDecision({ actionId, decision: 'confirmed' })).toMatchObject({
      action: { id: actionId, status: 'confirmed' },
      auditRecord: { actionId, eventType: 'confirmed' },
    });

    const workspaceAfterConfirm = getAlphaWorkspaceSnapshot();
    expect(workspaceAfterConfirm.actions.find((action) => action.id === actionId)?.status).toBe('confirmed');
    expect(workspaceAfterConfirm.auditRecords).toHaveLength(1);

    expect(createAlphaActionDecision({ actionId, decision: 'rejected' })).toMatchObject({
      action: { id: actionId, status: 'rejected' },
      auditRecord: { actionId, eventType: 'rejected' },
    });

    const workspaceAfterReject = getAlphaWorkspaceSnapshot();
    expect(workspaceAfterReject.actions.find((action) => action.id === actionId)?.status).toBe('rejected');
    expect(workspaceAfterReject.auditRecords.map((record) => record.eventType)).toEqual(['confirmed', 'rejected']);
  });

  it('returns null for unknown action decisions', () => {
    expect(createAlphaActionDecision({ actionId: 'missing', decision: 'confirmed' })).toBeNull();
  });
});
