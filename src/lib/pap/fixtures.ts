import type { CalendarEvent, EmailMessage, UserPreferences } from './types';

export const samplePreferences: UserPreferences = {
  userId: 'user_1',
  timeZone: 'Europe/Berlin',
  workHours: { startHour: 9, endHour: 17 },
  deepWorkHours: [{ startHour: 9, endHour: 11 }],
  preferredTone: 'concise',
  automationPermissions: ['archive_marketing', 'summarize_newsletters'],
  highRiskKeywords: ['contract', 'payment', 'quote', 'legal', 'passport', 'invoice'],
  contacts: [
    {
      email: 'maya@client.example',
      name: 'Maya Chen',
      importance: 'important',
      alwaysConfirm: true,
      timeZone: 'Asia/Tokyo',
    },
    {
      email: 'alex@studio.example',
      name: 'Alex Rivera',
      importance: 'normal',
      alwaysConfirm: false,
      timeZone: 'America/New_York',
    },
  ],
};

export const sampleEmails: EmailMessage[] = [
  {
    id: 'email_1',
    threadId: 'thread_1',
    from: 'deals@saas.example',
    to: ['me@example.com'],
    subject: 'Limited offer for remote teams',
    body: 'Promotion ends tonight. Unsubscribe anytime.',
    receivedAt: '2026-05-04T07:15:00.000Z',
    labels: [],
  },
  {
    id: 'email_2',
    threadId: 'thread_2',
    from: 'maya@client.example',
    to: ['me@example.com'],
    subject: 'Proposal timing and contract review',
    body: 'Can you confirm whether the contract can be ready by Friday?',
    receivedAt: '2026-05-04T08:10:00.000Z',
    labels: [],
  },
  {
    id: 'email_3',
    threadId: 'thread_3',
    from: 'alex@studio.example',
    to: ['me@example.com'],
    subject: 'Meeting next week',
    body: 'Can we meet next Tuesday afternoon to discuss the product demo?',
    receivedAt: '2026-05-04T09:30:00.000Z',
    labels: [],
  },
  {
    id: 'email_4',
    threadId: 'thread_4',
    from: 'updates@industry.example',
    to: ['me@example.com'],
    subject: 'Weekly AI tools digest',
    body: 'Newsletter with market updates for founders and digital nomads.',
    receivedAt: '2026-05-04T10:00:00.000Z',
    labels: [],
  },
];

export const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: 'event_1',
    title: 'Deep work block',
    startsAt: '2026-05-05T07:00:00.000Z',
    endsAt: '2026-05-05T09:00:00.000Z',
    attendees: ['me@example.com'],
  },
  {
    id: 'event_2',
    title: 'Investor sync',
    startsAt: '2026-05-05T12:00:00.000Z',
    endsAt: '2026-05-05T13:00:00.000Z',
    attendees: ['me@example.com', 'investor@example.com'],
  },
];
