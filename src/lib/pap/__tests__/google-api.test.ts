import { beforeEach, describe, expect, it, vi } from 'vitest';
import { googleRestClient } from '../google-api';

describe('googleRestClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requests projected Calendar fields and stores sanitized event metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: 'event_1',
        summary: 'Planning',
        description: 'Roadmap',
        start: { dateTime: '2026-05-18T12:00:00.000Z', unrelatedStartField: 'drop-me' },
        end: { dateTime: '2026-05-18T13:00:00.000Z', unrelatedEndField: 'drop-me' },
        attendees: [{ email: 'teammate@example.com', responseStatus: 'accepted' }],
        hangoutLink: 'https://meet.google.com/abc-defg-hij',
        extendedProperties: { private: { secret: 'drop-me' } },
        creator: { email: 'creator@example.com' },
      }],
    }), { status: 200 }));

    const snapshots = await googleRestClient.listUpcomingEvents('access-token', {
      timeMin: new Date('2026-05-17T12:00:00.000Z'),
      timeMax: new Date('2026-05-31T12:00:00.000Z'),
    });

    const requestedUrl = fetchMock.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.searchParams.get('fields')).toBe('items(id,summary,description,start(date,dateTime),end(date,dateTime),attendees(email))');
    expect(snapshots).toEqual([{
      googleEventId: 'event_1',
      calendarId: 'primary',
      title: 'Planning',
      description: 'Roadmap',
      startsAt: new Date('2026-05-18T12:00:00.000Z'),
      endsAt: new Date('2026-05-18T13:00:00.000Z'),
      attendees: ['teammate@example.com'],
      rawMetadataJson: {
        id: 'event_1',
        summary: 'Planning',
        description: 'Roadmap',
        start: { dateTime: '2026-05-18T12:00:00.000Z' },
        end: { dateTime: '2026-05-18T13:00:00.000Z' },
        attendees: [{ email: 'teammate@example.com' }],
      },
    }]);
  });
});
