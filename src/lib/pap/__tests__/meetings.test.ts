import { describe, expect, it } from 'vitest';
import { createMeetingSuggestions } from '../meetings';
import type { CalendarEvent, TriagedEmail, UserPreferences } from '../types';

const preferences: UserPreferences = {
  userId: 'user_1',
  timeZone: 'Europe/Berlin',
  workHours: { startHour: 9, endHour: 17 },
  deepWorkHours: [{ startHour: 9, endHour: 11 }],
  preferredTone: 'concise',
  automationPermissions: [],
  highRiskKeywords: [],
  contacts: [],
};

const meetingEmail: TriagedEmail = {
  email: {
    id: 'email_1',
    threadId: 'thread_1',
    from: 'alex@example.com',
    to: ['me@example.com'],
    subject: 'Meeting next week',
    body: 'Can we meet next Tuesday afternoon?',
    receivedAt: '2026-05-04T09:30:00.000Z',
    labels: [],
  },
  category: 'meeting',
  importanceScore: 60,
  needsReply: true,
  hasMeetingIntent: true,
  risk: { level: 'low', reasons: ['No high-risk triggers found'], requiresConfirmation: false },
};

const events: CalendarEvent[] = [
  {
    id: 'event_1',
    title: 'Busy slot',
    startsAt: '2026-05-05T12:00:00.000Z',
    endsAt: '2026-05-05T13:00:00.000Z',
    attendees: ['me@example.com'],
  },
];

describe('createMeetingSuggestions', () => {
  it('creates three candidate slots for meeting emails', () => {
    const suggestions = createMeetingSuggestions([meetingEmail], events, preferences);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].emailId).toBe('email_1');
    expect(suggestions[0].proposedSlots).toHaveLength(3);
    expect(suggestions[0].proposedSlots[0].startsAt).toBe('2026-05-05T11:00:00.000Z');
  });

  it('skips non-meeting emails', () => {
    const suggestions = createMeetingSuggestions(
      [{ ...meetingEmail, hasMeetingIntent: false, category: 'unknown' }],
      events,
      preferences,
    );

    expect(suggestions).toEqual([]);
  });
});
