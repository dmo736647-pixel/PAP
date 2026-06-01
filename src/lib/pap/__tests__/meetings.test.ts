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
  it('creates candidate slots for meeting emails respecting timezone and deep work', () => {
    const suggestions = createMeetingSuggestions([meetingEmail], events, preferences);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].emailId).toBe('email_1');
    expect(suggestions[0].proposedSlots.length).toBeGreaterThanOrEqual(2);
    expect(suggestions[0].participantName).toBe('Alex');
    expect(suggestions[0].participantEmail).toBe('alex@example.com');
    expect(suggestions[0].userTimeZone).toBe('Europe/Berlin');
    expect(suggestions[0].draftReply).toContain('Alex');
    expect(suggestions[0].draftReply).toContain('Meeting next week');
  });

  it('skips non-meeting emails', () => {
    const suggestions = createMeetingSuggestions(
      [{ ...meetingEmail, hasMeetingIntent: false, category: 'unknown' }],
      events,
      preferences,
    );

    expect(suggestions).toEqual([]);
  });

  it('generates a draft reply with proposed times', () => {
    const suggestions = createMeetingSuggestions([meetingEmail], [], preferences);
    const draft = suggestions[0].draftReply;

    expect(draft).toContain('Hi Alex');
    expect(draft).toContain('Meeting next week');
    expect(draft).toContain('1.');
    expect(draft).toContain('Best regards');
  });

  it('returns fewer slots when one day is fully booked', () => {
    const fullDayEvents: CalendarEvent[] = [];
    // Create events covering all work hours on day 1
    for (let hour = 9; hour < 17; hour += 1) {
      fullDayEvents.push({
        id: `event_${hour}`,
        title: `Block ${hour}`,
        startsAt: `2026-05-05T${String(hour - 2).padStart(2, '0')}:00:00.000Z`,
        endsAt: `2026-05-05T${String(hour - 1).padStart(2, '0')}:00:00.000Z`,
        attendees: [],
      });
    }
    const suggestions = createMeetingSuggestions([meetingEmail], fullDayEvents, {
      ...preferences,
      deepWorkHours: [],
    });
    // Day 1 is fully booked, but days 2-5 still have slots
    expect(suggestions[0].proposedSlots.length).toBeGreaterThan(0);
    // No slots should be on day 1 (May 5)
    const day1Slots = suggestions[0].proposedSlots.filter((s) => s.startsAt.startsWith('2026-05-05'));
    expect(day1Slots).toHaveLength(0);
  });

  it('uses contact name when available', () => {
    const prefsWithContact: UserPreferences = {
      ...preferences,
      contacts: [{ email: 'alex@example.com', name: 'Alex Rivera', importance: 'normal', alwaysConfirm: false }],
    };
    const suggestions = createMeetingSuggestions([meetingEmail], [], prefsWithContact);

    expect(suggestions[0].participantName).toBe('Alex Rivera');
    expect(suggestions[0].draftReply).toContain('Alex Rivera');
  });
});
