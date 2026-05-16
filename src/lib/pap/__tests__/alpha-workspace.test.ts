import { describe, expect, it } from 'vitest';
import { alphaIntegrationStatus, createAlphaActionDecision, createAlphaWorkspaceSnapshot } from '../alpha-workspace';

describe('alpha workspace', () => {
  it('creates a private alpha workspace from the demo pipeline', () => {
    const workspace = createAlphaWorkspaceSnapshot();

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

  it('creates confirm and reject decisions with audit records', () => {
    const actionId = createAlphaWorkspaceSnapshot().actions[0].id;

    expect(createAlphaActionDecision({ actionId, decision: 'confirmed' })).toMatchObject({
      action: { id: actionId, status: 'confirmed' },
      auditRecord: { actionId, eventType: 'confirmed' },
    });
    expect(createAlphaActionDecision({ actionId, decision: 'rejected' })).toMatchObject({
      action: { id: actionId, status: 'rejected' },
      auditRecord: { actionId, eventType: 'rejected' },
    });
  });

  it('returns null for unknown action decisions', () => {
    expect(createAlphaActionDecision({ actionId: 'missing', decision: 'confirmed' })).toBeNull();
  });
});
