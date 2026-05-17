import { describe, expect, it } from 'vitest';
import { createGoogleWorkspaceBriefing } from '../google-workspace';
import { samplePreferences } from '../fixtures';

describe('google workspace generation', () => {
  it('generates a PAP briefing from Google snapshots', () => {
    const briefing = createGoogleWorkspaceBriefing({
      now: '2026-05-17T12:00:00.000Z',
      preferences: samplePreferences,
      emailSnapshots: [
        {
          id: 'snapshot_1',
          googleMessageId: 'gmail_1',
          threadId: 'thread_1',
          from: 'maya@client.example',
          to: ['me@example.com'],
          subject: 'Contract review',
          snippet: 'Can you confirm whether the contract can be ready by Friday?',
          receivedAt: new Date('2026-05-17T08:00:00.000Z'),
          labels: ['INBOX'],
        },
      ],
      calendarSnapshots: [
        {
          id: 'event_snapshot_1',
          googleEventId: 'event_1',
          title: 'Busy slot',
          startsAt: new Date('2026-05-18T12:00:00.000Z'),
          endsAt: new Date('2026-05-18T13:00:00.000Z'),
          attendees: ['me@example.com'],
        },
      ],
    });

    expect(briefing.pendingConfirmations).toHaveLength(1);
    expect(briefing.pendingConfirmations[0].title).toBe('Review important email from Maya Chen');
    expect(briefing.date).toBe('2026-05-17');
  });

  it('anchors meeting suggestions to the Google workspace date', () => {
    const briefing = createGoogleWorkspaceBriefing({
      now: '2026-05-17T12:00:00.000Z',
      preferences: samplePreferences,
      emailSnapshots: [
        {
          id: 'snapshot_1',
          googleMessageId: 'gmail_1',
          threadId: 'thread_1',
          from: 'client@example.com',
          to: ['me@example.com'],
          subject: 'Schedule a call',
          snippet: 'Could you suggest a meeting time next week?',
          receivedAt: new Date('2026-05-17T08:00:00.000Z'),
          labels: ['INBOX'],
        },
      ],
      calendarSnapshots: [],
    });

    expect(briefing.meetingSuggestions[0].proposedSlots[0].startsAt).toContain('2026-05-17');
    expect(new Date(briefing.meetingSuggestions[0].proposedSlots[0].startsAt).getTime()).toBeGreaterThan(
      new Date('2026-05-17T12:00:00.000Z').getTime(),
    );
  });
});
