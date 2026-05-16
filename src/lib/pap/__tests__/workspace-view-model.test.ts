import { describe, expect, it } from 'vitest';
import { runPapV1Pipeline } from '../pipeline';
import { createPapWorkspaceViewModel } from '../workspace-view-model';

const briefing = runPapV1Pipeline();

describe('workspace view model', () => {
  it('summarizes local demo state and loading alpha state', () => {
    const view = createPapWorkspaceViewModel({
      briefing,
      actionResults: [],
      auditEvents: [],
    });

    expect(view.local).toMatchObject({
      pendingCount: briefing.pendingConfirmations.length,
      handledCount: briefing.automaticallyHandled.length,
      meetingCount: briefing.meetingSuggestions.length,
      auditCount: 0,
    });
    expect(view.alpha).toMatchObject({
      syncState: 'loading',
      pendingCount: 0,
      auditCount: 0,
    });
  });

  it('summarizes completed local actions and ready alpha workspace state', () => {
    const view = createPapWorkspaceViewModel({
      briefing,
      actionResults: [
        { id: briefing.pendingConfirmations[0].id, title: 'Confirmed action', status: 'confirmed' },
        { id: `${briefing.meetingSuggestions[0].emailId}_slot`, title: 'Meeting slot', status: 'slotUsed' },
      ],
      auditEvents: [{
        id: 'event_1',
        actionId: briefing.pendingConfirmations[0].id,
        actionTitle: 'Confirmed action',
        eventType: 'confirmed',
        createdAt: '2026-05-04T12:00:00.000Z',
      }],
      alphaWorkspace: {
        integrationStatus: {
          source: 'demo_data',
          gmail: 'not_connected',
          calendar: 'not_connected',
          storage: 'browser_local',
          automationMode: 'confirmation_only',
        },
        workspace: {
          user: { id: 'user_1', email: 'user@example.com', name: 'User', timeZone: 'UTC', createdAt: '2026-05-04T12:00:00.000Z' },
          connectedAccounts: [],
          briefings: [],
          actions: [
            { id: 'a1', userId: 'user_1', briefingId: 'b1', sourceActionId: 's1', status: 'pending', title: 'Pending', updatedAt: '2026-05-04T12:00:00.000Z' },
            { id: 'a2', userId: 'user_1', briefingId: 'b1', sourceActionId: 's2', status: 'confirmed', title: 'Done', updatedAt: '2026-05-04T12:00:00.000Z' },
          ],
          auditRecords: [{ id: 'r1', userId: 'user_1', actionId: 'a2', eventType: 'confirmed', title: 'Done', createdAt: '2026-05-04T12:00:00.000Z' }],
        },
      },
      lastDecisionSync: 'synced',
    });

    expect(view.local.pendingCount).toBe(briefing.pendingConfirmations.length - 1);
    expect(view.local.meetingCount).toBe(briefing.meetingSuggestions.length - 1);
    expect(view.local.auditCount).toBe(1);
    expect(view.alpha).toMatchObject({
      syncState: 'ready',
      pendingCount: 1,
      auditCount: 1,
      lastDecisionSync: 'synced',
    });
  });

  it('reports failed alpha state when the API failed', () => {
    const view = createPapWorkspaceViewModel({
      briefing,
      actionResults: [],
      auditEvents: [],
      alphaError: 'alpha-api-unavailable',
    });

    expect(view.alpha.syncState).toBe('failed');
  });
});
