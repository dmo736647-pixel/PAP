import { describe, expect, it } from 'vitest';
import { calendarSnapshotToCalendarEvent, emailSnapshotToEmailMessage } from '../google-snapshots';

describe('google snapshot connector', () => {
  it('maps Gmail snapshots to PAP email messages', () => {
    const message = emailSnapshotToEmailMessage({
      id: 'snapshot_1',
      googleMessageId: 'gmail_1',
      threadId: 'thread_1',
      from: 'client@example.com',
      to: ['me@example.com'],
      subject: 'Contract review',
      snippet: 'Please review the contract before Friday.',
      receivedAt: new Date('2026-05-17T08:00:00.000Z'),
      labels: ['INBOX'],
    });

    expect(message).toEqual({
      id: 'gmail_1',
      threadId: 'thread_1',
      from: 'client@example.com',
      to: ['me@example.com'],
      subject: 'Contract review',
      body: 'Please review the contract before Friday.',
      receivedAt: '2026-05-17T08:00:00.000Z',
      labels: ['INBOX'],
    });
  });

  it('extracts sender email addresses from Gmail display-name headers', () => {
    const message = emailSnapshotToEmailMessage({
      id: 'snapshot_1',
      googleMessageId: 'gmail_1',
      threadId: 'thread_1',
      from: 'Maya Chen <maya@client.example>',
      to: ['me@example.com'],
      subject: 'Contract review',
      snippet: 'Please review the contract before Friday.',
      receivedAt: new Date('2026-05-17T08:00:00.000Z'),
      labels: ['INBOX'],
    });

    expect(message.from).toBe('maya@client.example');
  });

  it('maps Calendar snapshots to PAP calendar events', () => {
    const event = calendarSnapshotToCalendarEvent({
      id: 'snapshot_1',
      googleEventId: 'event_1',
      title: 'Investor sync',
      startsAt: new Date('2026-05-18T12:00:00.000Z'),
      endsAt: new Date('2026-05-18T13:00:00.000Z'),
      attendees: ['me@example.com', 'investor@example.com'],
    });

    expect(event).toEqual({
      id: 'event_1',
      title: 'Investor sync',
      startsAt: '2026-05-18T12:00:00.000Z',
      endsAt: '2026-05-18T13:00:00.000Z',
      attendees: ['me@example.com', 'investor@example.com'],
    });
  });
});
