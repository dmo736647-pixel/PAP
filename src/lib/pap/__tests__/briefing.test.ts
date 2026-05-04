import { describe, expect, it } from 'vitest';
import { createDailyBriefing } from '../briefing';
import type { MeetingSuggestion, SuggestedAction, TriagedEmail } from '../types';

const importantEmail: TriagedEmail = {
  email: {
    id: 'email_1',
    threadId: 'thread_1',
    from: 'client@example.com',
    to: ['me@example.com'],
    subject: 'Contract review',
    body: 'Please review the contract.',
    receivedAt: '2026-05-04T08:00:00.000Z',
    labels: [],
  },
  category: 'important',
  importanceScore: 95,
  needsReply: true,
  hasMeetingIntent: false,
  risk: { level: 'high', reasons: ['Contains high-risk keyword: contract'], requiresConfirmation: true },
};

const lowValueEmail: TriagedEmail = {
  ...importantEmail,
  email: { ...importantEmail.email, id: 'email_2', subject: 'Limited offer' },
  category: 'marketing',
  importanceScore: 10,
  needsReply: false,
  risk: { level: 'low', reasons: ['No high-risk triggers found'], requiresConfirmation: false },
};

const pendingAction: SuggestedAction = {
  id: 'action_1',
  emailId: 'email_1',
  type: 'force_confirmation',
  title: 'Review important email from client@example.com',
  summary: 'Contract review',
  rationale: 'Contains high-risk keyword: contract',
  riskLevel: 'high',
  requiresConfirmation: true,
  canUndo: false,
};

const automaticAction: SuggestedAction = {
  id: 'action_2',
  emailId: 'email_2',
  type: 'archive',
  title: 'Archive low-value marketing email',
  summary: 'Limited offer',
  rationale: 'Marketing email matched an allowed automation rule.',
  riskLevel: 'low',
  requiresConfirmation: false,
  canUndo: true,
};

const meetingSuggestion: MeetingSuggestion = {
  emailId: 'email_3',
  title: 'Coordinate meeting: Meeting next week',
  proposedSlots: [
    {
      startsAt: '2026-05-05T09:00:00.000Z',
      endsAt: '2026-05-05T10:00:00.000Z',
      rationale: 'Open work-hour slot.',
    },
  ],
};

describe('createDailyBriefing', () => {
  it('aggregates priorities, pending confirmations, automatic actions, and meetings', () => {
    const briefing = createDailyBriefing({
      now: '2026-05-04T12:00:00.000Z',
      triagedEmails: [importantEmail, lowValueEmail],
      actions: [pendingAction, automaticAction],
      meetingSuggestions: [meetingSuggestion],
    });

    expect(briefing.date).toBe('2026-05-04');
    expect(briefing.importantEmails).toEqual([importantEmail]);
    expect(briefing.pendingConfirmations).toEqual([pendingAction]);
    expect(briefing.automaticallyHandled).toEqual([automaticAction]);
    expect(briefing.lowValueHandledCount).toBe(1);
    expect(briefing.topPriorities).toEqual([
      'Review important email from client@example.com',
      'Coordinate meeting: Meeting next week',
      'PAP automatically handled 1 low-value item.',
    ]);
  });
});
