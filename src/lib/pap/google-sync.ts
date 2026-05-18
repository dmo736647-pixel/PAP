import { decryptSecret } from './crypto';
import { googleRestClient, type GoogleCalendarSnapshotInput, type GoogleEmailSnapshotInput, type GoogleReadOnlyClient } from './google-api';
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

export type GoogleSyncStore = {
  createSyncRun(userId: string): Promise<{ id: string }>;
  replaceEmailSnapshots(userId: string, syncRunId: string, snapshots: GoogleEmailSnapshotInput[]): Promise<void>;
  replaceCalendarSnapshots(userId: string, syncRunId: string, snapshots: GoogleCalendarSnapshotInput[]): Promise<void>;
  createWorkspace(workspace: { userId: string; briefing: DailyBriefing }): Promise<void>;
  finishSyncRun(syncRunId: string, counts: { gmailMessageCount: number; calendarEventCount: number }): Promise<void>;
  failSyncRun(syncRunId: string, errorMessage: string): Promise<void>;
};

export async function syncGoogleSnapshots(input: {
  userId: string;
  now: Date;
  preferences?: UserPreferences;
  loadCredential?: (userId: string) => Promise<GoogleCredentialLike | null>;
  decryptToken?: (encrypted: string) => string;
  googleClient?: GoogleReadOnlyClient;
  store?: GoogleSyncStore;
}): Promise<GoogleSyncResult> {
  const store = input.store ?? prismaGoogleSyncStore;
  const loadCredential = input.loadCredential ?? loadLatestCredential;
  const decryptToken = input.decryptToken ?? ((encrypted) => decryptSecret(encrypted));
  const googleClient = input.googleClient ?? googleRestClient;
  const syncRun = await store.createSyncRun(input.userId);

  try {
    const credential = await loadCredential(input.userId);
    if (!credential) {
      throw new Error('Google credential not found');
    }

    const accessToken = decryptToken(credential.accessTokenEncrypted);
    const timeMax = new Date(input.now);
    timeMax.setUTCDate(timeMax.getUTCDate() + 14);

    const emailSnapshots = await googleClient.listRecentMessages(accessToken, 50);
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

    await store.replaceEmailSnapshots(input.userId, syncRun.id, emailSnapshots);
    await store.replaceCalendarSnapshots(input.userId, syncRun.id, calendarSnapshots);
    await store.createWorkspace({ userId: input.userId, briefing });
    await store.finishSyncRun(syncRun.id, {
      gmailMessageCount: emailSnapshots.length,
      calendarEventCount: calendarSnapshots.length,
    });

    return {
      status: 'succeeded',
      gmailMessageCount: emailSnapshots.length,
      calendarEventCount: calendarSnapshots.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sync failed';
    await store.failSyncRun(syncRun.id, message);
    return { status: 'failed', errorMessage: message };
  }
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

  async replaceEmailSnapshots(userId, syncRunId, snapshots) {
    await prisma.googleEmailSnapshot.deleteMany({ where: { userId } });
    await prisma.googleEmailSnapshot.createMany({
      data: snapshots.map((snapshot) => ({
        userId,
        syncRunId,
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
  },

  async replaceCalendarSnapshots(userId, syncRunId, snapshots) {
    await prisma.googleCalendarEventSnapshot.deleteMany({ where: { userId } });
    await prisma.googleCalendarEventSnapshot.createMany({
      data: snapshots.map((snapshot) => ({
        userId,
        syncRunId,
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
  },

  async createWorkspace(workspace) {
    await prisma.papWorkspace.create({
      data: {
        userId: workspace.userId,
        source: 'google',
        status: 'generated',
        briefingJson: workspace.briefing as unknown as object,
        pendingActionsJson: workspace.briefing.pendingConfirmations as unknown as object,
        automaticallyHandledJson: workspace.briefing.automaticallyHandled as unknown as object,
        meetingSuggestionsJson: workspace.briefing.meetingSuggestions as unknown as object,
        auditEventsJson: [],
      },
    });
  },

  async finishSyncRun(syncRunId, counts) {
    await prisma.googleSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: 'succeeded',
        finishedAt: new Date(),
        gmailMessageCount: counts.gmailMessageCount,
        calendarEventCount: counts.calendarEventCount,
      },
    });
  },

  async failSyncRun(syncRunId, errorMessage) {
    await prisma.googleSyncRun.update({
      where: { id: syncRunId },
      data: { status: 'failed', finishedAt: new Date(), errorMessage },
    });
  },
};
