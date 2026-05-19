import { NextRequest, NextResponse } from 'next/server';
import { alphaIntegrationStatus, getAlphaWorkspaceSnapshot } from '@/lib/pap/alpha-workspace';
import { createAlphaActionRecords, type AlphaWorkspaceSnapshot } from '@/lib/pap/alpha-data-model';
import { prisma } from '@/lib/pap/prisma';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';
import type { DailyBriefing, PapIntegrationStatus } from '@/lib/pap/types';

const liveGoogleIntegrationStatus: PapIntegrationStatus = {
  source: 'live_google',
  gmail: 'connected',
  calendar: 'connected',
  storage: 'server',
  automationMode: 'confirmation_only',
};

export function GET(request?: NextRequest) {
  const cookie = request?.cookies.get(papSessionCookieName)?.value;
  const session = cookie ? parseSessionCookieValue(cookie) : null;

  if (session) {
    return getLiveGoogleWorkspaceResponse(session.userId);
  }

  return getDemoWorkspaceResponse();
}

async function getLiveGoogleWorkspaceResponse(userId: string) {
  const workspace = await prisma.papWorkspace.findFirst({
    where: { userId, source: 'google' },
    orderBy: { generatedAt: 'desc' },
    include: { user: true },
  });

  if (!workspace) {
    return getDemoWorkspaceResponse();
  }

  return NextResponse.json({
    integrationStatus: liveGoogleIntegrationStatus,
    workspace: createLiveGoogleWorkspaceSnapshot({
      workspaceId: workspace.id,
      userId: workspace.userId,
      email: workspace.user.email,
      name: workspace.user.name,
      generatedAt: workspace.generatedAt,
      briefing: workspace.briefingJson as unknown as DailyBriefing,
    }),
  });
}

function getDemoWorkspaceResponse() {
  return NextResponse.json({
    integrationStatus: alphaIntegrationStatus,
    workspace: getAlphaWorkspaceSnapshot(),
  });
}

function createLiveGoogleWorkspaceSnapshot(input: {
  workspaceId: string;
  userId: string;
  email: string;
  name: string | null;
  generatedAt: Date;
  briefing: DailyBriefing;
}): AlphaWorkspaceSnapshot {
  const createdAt = input.generatedAt.toISOString();
  const briefingId = `google:${input.workspaceId}`;

  return {
    user: {
      id: input.userId,
      email: input.email,
      name: input.name ?? input.email,
      timeZone: 'UTC',
      createdAt,
    },
    connectedAccounts: [
      {
        id: 'google_live',
        userId: input.userId,
        provider: 'google',
        status: 'connected',
        scopes: ['gmail.readonly', 'calendar.readonly'],
        connectedAt: createdAt,
        lastSyncedAt: createdAt,
      },
    ],
    briefings: [
      {
        id: briefingId,
        userId: input.userId,
        briefing: input.briefing,
        source: 'live_google',
        createdAt,
      },
    ],
    actions: createAlphaActionRecords({
      userId: input.userId,
      briefingId,
      briefing: input.briefing,
      createdAt,
    }),
    auditRecords: [],
  };
}
