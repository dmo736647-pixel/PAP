import { describe, expect, it, vi } from 'vitest';

vi.mock('../prisma', () => ({
  prisma: {},
}));

const { syncGoogleSnapshots } = await import('../google-sync');

const credential = {
  id: 'credential_1',
  userId: 'user_1',
  accessTokenEncrypted: 'encrypted-access',
  refreshTokenEncrypted: 'encrypted-refresh',
  expiresAt: new Date('2026-05-17T13:00:00.000Z'),
  scope: 'scope',
};

const preferences = {
  userId: 'user_1',
  timeZone: 'Europe/Berlin',
  workHours: { startHour: 9, endHour: 17 },
  deepWorkHours: [],
  preferredTone: 'concise' as const,
  automationPermissions: ['archive_marketing', 'summarize_newsletters'],
  highRiskKeywords: ['contract'],
  contacts: [{ email: 'client@example.com', name: 'Client', importance: 'important' as const, alwaysConfirm: true }],
};

const emailSnapshot = {
  googleMessageId: 'gmail_1',
  threadId: 'thread_1',
  from: 'client@example.com',
  to: ['me@example.com'],
  subject: 'Contract review',
  snippet: 'Please review the contract.',
  receivedAt: new Date('2026-05-17T08:00:00.000Z'),
  labels: ['INBOX'],
  rawMetadataJson: { id: 'gmail_1' },
};

const calendarSnapshot = {
  googleEventId: 'event_1',
  calendarId: 'primary',
  title: 'Busy slot',
  description: '',
  startsAt: new Date('2026-05-18T12:00:00.000Z'),
  endsAt: new Date('2026-05-18T13:00:00.000Z'),
  attendees: ['me@example.com'],
  rawMetadataJson: { id: 'event_1' },
};

describe('syncGoogleSnapshots', () => {
  it('writes snapshots and workspace on success in one completion operation', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences,
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => [emailSnapshot],
        listUpcomingEvents: async () => [calendarSnapshot],
      },
      store: {
        createSyncRun: async () => {
          operations.push('createSyncRun');
          return { id: 'sync_1' };
        },
        updateCredentialTokens: async () => operations.push('updateCredentialTokens'),
        completeSuccessfulSync: async ({ briefing, emailSnapshots, calendarSnapshots, counts }) => {
          operations.push(`completeSuccessfulSync:${briefing.pendingConfirmations.length}:${emailSnapshots.length}:${calendarSnapshots.length}:${counts.gmailMessageCount}:${counts.calendarEventCount}`);
        },
        failSyncRun: async () => operations.push('failSyncRun'),
      },
    });

    expect(result).toEqual({ status: 'succeeded', gmailMessageCount: 1, calendarEventCount: 1 });
    expect(operations).toEqual([
      'createSyncRun',
      'completeSuccessfulSync:1:1:1:1:1',
    ]);
  });

  it('records a failed sync without completing success persistence', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences: { ...preferences, automationPermissions: [], highRiskKeywords: [], contacts: [] },
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => { throw new Error('Gmail unavailable'); },
        listUpcomingEvents: async () => [],
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        updateCredentialTokens: async () => operations.push('updateCredentialTokens'),
        completeSuccessfulSync: async () => operations.push('completeSuccessfulSync'),
        failSyncRun: async (_syncRunId, message) => operations.push(`failSyncRun:${message}`),
      },
    });

    expect(result.status).toBe('failed');
    expect(operations).toEqual(['failSyncRun:Gmail unavailable']);
  });

  it('uses an existing access token when it is not near expiry', async () => {
    const tokensUsed: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences,
      loadCredential: async () => credential,
      decryptToken: (encrypted) => encrypted === 'encrypted-access' ? 'existing-access-token' : 'refresh-token',
      encryptToken: (token) => `encrypted:${token}`,
      refreshAccessToken: async () => { throw new Error('refresh should not run'); },
      googleClient: {
        listRecentMessages: async (accessToken) => {
          tokensUsed.push(accessToken);
          return [];
        },
        listUpcomingEvents: async (accessToken) => {
          tokensUsed.push(accessToken);
          return [];
        },
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        updateCredentialTokens: async () => { throw new Error('token update should not run'); },
        completeSuccessfulSync: async () => undefined,
        failSyncRun: async () => undefined,
      },
    });

    expect(result.status).toBe('succeeded');
    expect(tokensUsed).toEqual(['existing-access-token', 'existing-access-token']);
  });

  it('refreshes and persists an expired access token before syncing', async () => {
    const operations: string[] = [];
    const tokensUsed: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences,
      loadCredential: async () => ({ ...credential, expiresAt: new Date('2026-05-17T11:59:00.000Z') }),
      decryptToken: (encrypted) => encrypted === 'encrypted-access' ? 'expired-access-token' : 'refresh-token',
      encryptToken: (token) => `encrypted:${token}`,
      refreshAccessToken: async (refreshToken) => {
        operations.push(`refresh:${refreshToken}`);
        return { access_token: 'refreshed-access-token', expires_in: 3600, scope: 'scope' };
      },
      googleClient: {
        listRecentMessages: async (accessToken) => {
          tokensUsed.push(accessToken);
          return [];
        },
        listUpcomingEvents: async (accessToken) => {
          tokensUsed.push(accessToken);
          return [];
        },
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        updateCredentialTokens: async (credentialId, tokenUpdate) => operations.push(`update:${credentialId}:${tokenUpdate.accessTokenEncrypted}:${tokenUpdate.expiresAt?.toISOString()}`),
        completeSuccessfulSync: async () => operations.push('completeSuccessfulSync'),
        failSyncRun: async () => operations.push('failSyncRun'),
      },
    });

    expect(result.status).toBe('succeeded');
    expect(tokensUsed).toEqual(['refreshed-access-token', 'refreshed-access-token']);
    expect(operations).toEqual([
      'refresh:refresh-token',
      'update:credential_1:encrypted:refreshed-access-token:2026-05-17T13:00:00.000Z',
      'completeSuccessfulSync',
    ]);
  });

  it('fails the sync when an expired access token cannot be refreshed', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences,
      loadCredential: async () => ({ ...credential, expiresAt: new Date('2026-05-17T11:59:00.000Z') }),
      decryptToken: (encrypted) => encrypted === 'encrypted-access' ? 'expired-access-token' : 'refresh-token',
      encryptToken: (token) => `encrypted:${token}`,
      refreshAccessToken: async () => { throw new Error('Google token refresh failed: 400'); },
      googleClient: {
        listRecentMessages: async () => {
          operations.push('listRecentMessages');
          return [];
        },
        listUpcomingEvents: async () => {
          operations.push('listUpcomingEvents');
          return [];
        },
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        updateCredentialTokens: async () => operations.push('updateCredentialTokens'),
        completeSuccessfulSync: async () => operations.push('completeSuccessfulSync'),
        failSyncRun: async (_syncRunId, message) => operations.push(`failSyncRun:${message}`),
      },
    });

    expect(result).toEqual({ status: 'failed', errorMessage: 'Google token refresh failed: 400' });
    expect(operations).toEqual(['failSyncRun:Google token refresh failed: 400']);
  });

  it('records a failed sync when success persistence fails', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences,
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => [emailSnapshot],
        listUpcomingEvents: async () => [calendarSnapshot],
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        updateCredentialTokens: async () => operations.push('updateCredentialTokens'),
        completeSuccessfulSync: async () => {
          operations.push('completeSuccessfulSync');
          throw new Error('transaction failed');
        },
        failSyncRun: async (_syncRunId, message) => operations.push(`failSyncRun:${message}`),
      },
    });

    expect(result).toEqual({ status: 'failed', errorMessage: 'transaction failed' });
    expect(operations).toEqual(['completeSuccessfulSync', 'failSyncRun:transaction failed']);
  });
});
