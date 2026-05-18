import { describe, expect, it } from 'vitest';
import { syncGoogleSnapshots } from '../google-sync';

const credential = {
  id: 'credential_1',
  userId: 'user_1',
  accessTokenEncrypted: 'encrypted-access',
  refreshTokenEncrypted: 'encrypted-refresh',
  expiresAt: new Date('2026-05-17T13:00:00.000Z'),
  scope: 'scope',
};

describe('syncGoogleSnapshots', () => {
  it('writes snapshots and workspace on success', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences: {
        userId: 'user_1',
        timeZone: 'Europe/Berlin',
        workHours: { startHour: 9, endHour: 17 },
        deepWorkHours: [],
        preferredTone: 'concise',
        automationPermissions: ['archive_marketing', 'summarize_newsletters'],
        highRiskKeywords: ['contract'],
        contacts: [{ email: 'client@example.com', name: 'Client', importance: 'important', alwaysConfirm: true }],
      },
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => [{
          googleMessageId: 'gmail_1',
          threadId: 'thread_1',
          from: 'client@example.com',
          to: ['me@example.com'],
          subject: 'Contract review',
          snippet: 'Please review the contract.',
          receivedAt: new Date('2026-05-17T08:00:00.000Z'),
          labels: ['INBOX'],
          rawMetadataJson: { id: 'gmail_1' },
        }],
        listUpcomingEvents: async () => [{
          googleEventId: 'event_1',
          calendarId: 'primary',
          title: 'Busy slot',
          description: '',
          startsAt: new Date('2026-05-18T12:00:00.000Z'),
          endsAt: new Date('2026-05-18T13:00:00.000Z'),
          attendees: ['me@example.com'],
          rawMetadataJson: { id: 'event_1' },
        }],
      },
      store: {
        createSyncRun: async () => {
          operations.push('createSyncRun');
          return { id: 'sync_1' };
        },
        replaceEmailSnapshots: async () => operations.push('replaceEmailSnapshots'),
        replaceCalendarSnapshots: async () => operations.push('replaceCalendarSnapshots'),
        createWorkspace: async (workspace) => {
          operations.push(`workspace:${workspace.briefing.pendingConfirmations.length}`);
        },
        finishSyncRun: async () => operations.push('finishSyncRun'),
        failSyncRun: async () => operations.push('failSyncRun'),
      },
    });

    expect(result).toEqual({ status: 'succeeded', gmailMessageCount: 1, calendarEventCount: 1 });
    expect(operations).toEqual([
      'createSyncRun',
      'replaceEmailSnapshots',
      'replaceCalendarSnapshots',
      'workspace:1',
      'finishSyncRun',
    ]);
  });

  it('records a failed sync without creating a workspace', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences: {
        userId: 'user_1',
        timeZone: 'Europe/Berlin',
        workHours: { startHour: 9, endHour: 17 },
        deepWorkHours: [],
        preferredTone: 'concise',
        automationPermissions: [],
        highRiskKeywords: [],
        contacts: [],
      },
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => { throw new Error('Gmail unavailable'); },
        listUpcomingEvents: async () => [],
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        replaceEmailSnapshots: async () => operations.push('replaceEmailSnapshots'),
        replaceCalendarSnapshots: async () => operations.push('replaceCalendarSnapshots'),
        createWorkspace: async () => operations.push('createWorkspace'),
        finishSyncRun: async () => operations.push('finishSyncRun'),
        failSyncRun: async (_syncRunId, message) => operations.push(`failSyncRun:${message}`),
      },
    });

    expect(result.status).toBe('failed');
    expect(operations).toEqual(['failSyncRun:Gmail unavailable']);
  });
});
