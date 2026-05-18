export type GoogleEmailSnapshotInput = {
  googleMessageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  receivedAt: Date;
  labels: string[];
  rawMetadataJson: unknown;
};

export type GoogleCalendarSnapshotInput = {
  googleEventId: string;
  calendarId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
  rawMetadataJson: unknown;
};

export type GoogleReadOnlyClient = {
  listRecentMessages(accessToken: string, maxResults: number): Promise<GoogleEmailSnapshotInput[]>;
  listUpcomingEvents(accessToken: string, input: { timeMin: Date; timeMax: Date }): Promise<GoogleCalendarSnapshotInput[]>;
};

export const googleRestClient: GoogleReadOnlyClient = {
  async listRecentMessages(accessToken, maxResults) {
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Gmail list failed: ${listResponse.status}`);
    }

    const listPayload = await listResponse.json() as { messages?: Array<{ id: string; threadId?: string }> };
    const messages = listPayload.messages ?? [];

    return Promise.all(messages.slice(0, maxResults).map(async (message) => {
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });

      if (!detailResponse.ok) {
        throw new Error(`Gmail message fetch failed: ${detailResponse.status}`);
      }

      const detail = await detailResponse.json() as {
        id: string;
        threadId?: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = detail.payload?.headers ?? [];
      const header = (name: string) => headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      return {
        googleMessageId: detail.id,
        threadId: detail.threadId ?? message.threadId ?? detail.id,
        from: header('From'),
        to: splitAddresses(header('To')),
        subject: header('Subject'),
        snippet: detail.snippet ?? '',
        receivedAt: parseDateHeader(header('Date')),
        labels: detail.labelIds ?? [],
        rawMetadataJson: detail,
      };
    }));
  },

  async listUpcomingEvents(accessToken, input) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', input.timeMin.toISOString());
    url.searchParams.set('timeMax', input.timeMax.toISOString());

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Calendar events fetch failed: ${response.status}`);
    }

    const payload = await response.json() as { items?: Array<{
      id?: string;
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: Array<{ email?: string }>;
    }> };

    return (payload.items ?? []).filter((event) => event.id && (event.start?.dateTime || event.start?.date) && (event.end?.dateTime || event.end?.date)).map((event) => ({
      googleEventId: event.id as string,
      calendarId: 'primary',
      title: event.summary ?? 'Untitled event',
      description: event.description ?? '',
      startsAt: new Date(event.start?.dateTime ?? `${event.start?.date}T00:00:00.000Z`),
      endsAt: new Date(event.end?.dateTime ?? `${event.end?.date}T00:00:00.000Z`),
      attendees: (event.attendees ?? []).map((attendee) => attendee.email).filter((email): email is string => Boolean(email)),
      rawMetadataJson: event,
    }));
  },
};

function splitAddresses(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseDateHeader(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
