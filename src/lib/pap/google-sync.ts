import type { PrismaClient } from '@prisma/client';
import { decryptSecret, encryptSecret } from './crypto';
import { googleRestClient, type GoogleCalendarSnapshotInput, type GoogleEmailSnapshotInput, type GoogleReadOnlyClient } from './google-api';
import { readGoogleOAuthConfig, refreshGoogleAccessToken, type GoogleTokenResponse } from './google-oauth';
import { createGoogleWorkspaceBriefing } from './google-workspace';
import { prisma } from './prisma';
import { samplePreferences } from './fixtures';
import type { DailyBriefing, UserPreferences } from './types';

export type GoogleCredentialLike = {
  id: string;
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  expiresAt: Date | null;
  scope: string;
};

export type GoogleSyncResult =
  | { status: 'succeeded'; gmailMessageCount: number; calendarEventCount: number }
  | { status: 'failed'; errorMessage: string };

export type GoogleSyncCounts = { gmailMessageCount: number; calendarEventCount: number };

export type GoogleSyncStore = {
  createSyncRun(userId: string): Promise<{ id: string }>;
  updateCredentialTokens(credentialId: string, tokens: { accessTokenEncrypted: string; expiresAt: Date | null }): Promise<void>;
  completeSuccessfulSync(input: {
    userId: string;
    syncRunId: string;
    emailSnapshots: GoogleEmailSnapshotInput[];
    calendarSnapshots: GoogleCalendarSnapshotInput[];
    briefing: DailyBriefing;
    counts: GoogleSyncCounts;
  }): Promise<void>;
  failSyncRun(syncRunId: string, errorMessage: string): Promise<void>;
};

export async function syncGoogleSnapshots(input: {
  userId: string;
  now: Date;
  preferences?: UserPreferences;
  loadCredential?: (userId: string) => Promise<GoogleCredentialLike | null>;
  decryptToken?: (encrypted: string) => string;
  encryptToken?: (token: string) => string;
  refreshAccessToken?: (refreshToken: string) => Promise<GoogleTokenResponse>;
  googleClient?: GoogleReadOnlyClient;
  store?: GoogleSyncStore;
}): Promise<GoogleSyncResult> {
  const store = input.store ?? prismaGoogleSyncStore;
  const loadCredential = input.loadCredential ?? loadLatestCredential;
  const decryptToken = input.decryptToken ?? ((encrypted) => decryptSecret(encrypted));
  const encryptToken = input.encryptToken ?? ((token) => encryptSecret(token));
  const refreshAccessToken = input.refreshAccessToken ?? ((refreshToken) => refreshGoogleAccessToken({
    refreshToken,
    config: readGoogleOAuthConfig(),
  }));
  const googleClient = input.googleClient ?? googleRestClient;
  const syncRun = await store.createSyncRun(input.userId);

  try {
    console.log('[Sync] Starting for user:', input.userId);
    const credential = await loadCredential(input.userId);
    if (!credential) {
      throw new Error('Google credential not found');
    }
    console.log('[Sync] Credential found, expires:', credential.expiresAt);

    let accessToken = decryptToken(credential.accessTokenEncrypted);
    console.log('[Sync] Token decrypted, length:', accessToken.length);

    if (shouldRefreshAccessToken(credential.expiresAt, input.now)) {
      console.log('[Sync] Token expired, refreshing...');
      if (!credential.refreshTokenEncrypted) {
        throw new Error('Google refresh token not found');
      }

      const refreshToken = decryptToken(credential.refreshTokenEncrypted);
      const refreshed = await refreshAccessToken(refreshToken);
      console.log('[Sync] Token refreshed successfully');
      accessToken = refreshed.access_token;
      const expiresAt = typeof refreshed.expires_in === 'number'
        ? new Date(input.now.getTime() + refreshed.expires_in * 1000)
        : null;
      await store.updateCredentialTokens(credential.id, {
        accessTokenEncrypted: encryptToken(refreshed.access_token),
        expiresAt,
      });
    }

    const timeMax = new Date(input.now);
    timeMax.setUTCDate(timeMax.getUTCDate() + 14);

    console.log('[Sync] Fetching Gmail messages...');
    const emailSnapshots = await googleClient.listRecentMessages(accessToken, 50);
    console.log('[Sync] Got', emailSnapshots.length, 'emails');
    console.log('[Sync] Fetching Calendar events...');
    const calendarSnapshots = await googleClient.listUpcomingEvents(accessToken, {
      timeMin: input.now,
      timeMax,
    });
    const preferences = { ...samplePreferences, ...(input.preferences ?? {}), userId: input.userId };
    const briefing = createGoogleWorkspaceBriefing({
      now: input.now.toISOString(),
      preferences,
      emailSnapshots: emailSnapshots.map((snapshot, index) => ({ ...snapshot, id: `email_${index}` })),
      calendarSnapshots: calendarSnapshots.map((snapshot, index) => ({ ...snapshot, id: `event_${index}` })),
    });
    const counts = {
      gmailMessageCount: emailSnapshots.length,
      calendarEventCount: calendarSnapshots.length,
    };

    await store.completeSuccessfulSync({
      userId: input.userId,
      syncRunId: syncRun.id,
      emailSnapshots,
      calendarSnapshots,
      briefing,
      counts,
    });

    return { status: 'succeeded', ...counts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sync failed';
    await store.failSyncRun(syncRun.id, message);
    return { status: 'failed', errorMessage: message };
  }
}

function shouldRefreshAccessToken(expiresAt: Date | null, now: Date): boolean {
  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= now.getTime() + 5 * 60 * 1000;
}

async function loadLatestCredential(userId: string): Promise<GoogleCredentialLike | null> {
  return prisma.googleCredential.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export const prismaGoogleSyncStore: GoogleSyncStore = {
  async createSyncRun(userId) {
    return prisma.googleSyncRun.create({ data: { userId, status: 'running' } });
  },

  async updateCredentialTokens(credentialId, tokens) {
    await prisma.googleCredential.update({
      where: { id: credentialId },
      data: {
        accessTokenEncrypted: tokens.accessTokenEncrypted,
        expiresAt: tokens.expiresAt,
      },
    });
  },

  async completeSuccessfulSync(input) {
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
      await tx.googleEmailSnapshot.deleteMany({ where: { userId: input.userId } });
      await tx.googleEmailSnapshot.createMany({
        data: input.emailSnapshots.map((snapshot) => ({
          userId: input.userId,
          syncRunId: input.syncRunId,
          googleMessageId: snapshot.googleMessageId,
          threadId: snapshot.threadId,
          from: snapshot.from,
          to: snapshot.to,
          subject: snapshot.subject,
          snippet: snapshot.snippet,
          receivedAt: snapshot.receivedAt,
          labels: snapshot.labels,
          rawMetadataJson: snapshot.rawMetadataJson as object,
        })),
      });
      await tx.googleCalendarEventSnapshot.deleteMany({ where: { userId: input.userId } });
      await tx.googleCalendarEventSnapshot.createMany({
        data: input.calendarSnapshots.map((snapshot) => ({
          userId: input.userId,
          syncRunId: input.syncRunId,
          googleEventId: snapshot.googleEventId,
          calendarId: snapshot.calendarId,
          title: snapshot.title,
          description: snapshot.description,
          startsAt: snapshot.startsAt,
          endsAt: snapshot.endsAt,
          attendees: snapshot.attendees,
          rawMetadataJson: snapshot.rawMetadataJson as object,
        })),
      });
      await tx.papWorkspace.create({
        data: {
          userId: input.userId,
          source: 'google',
          status: 'generated',
          briefingJson: input.briefing as unknown as object,
          pendingActionsJson: input.briefing.pendingConfirmations as unknown as object,
          automaticallyHandledJson: input.briefing.automaticallyHandled as unknown as object,
          meetingSuggestionsJson: input.briefing.meetingSuggestions as unknown as object,
          auditEventsJson: [],
        },
      });
      await tx.googleSyncRun.update({
        where: { id: input.syncRunId },
        data: {
          status: 'succeeded',
          finishedAt: new Date(),
          gmailMessageCount: input.counts.gmailMessageCount,
          calendarEventCount: input.counts.calendarEventCount,
        },
      });
    });
  },

  async failSyncRun(syncRunId, errorMessage) {
    await prisma.googleSyncRun.update({
      where: { id: syncRunId },
      data: { status: 'failed', finishedAt: new Date(), errorMessage },
    });
  },
};
