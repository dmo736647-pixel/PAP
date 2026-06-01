import { proxyFetch } from './proxy-fetch';

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
    const listResponse = await proxyFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Gmail list failed: ${listResponse.status}`);
    }

    const listPayload = await listResponse.json() as { messages?: Array<{ id: string; threadId?: string }> };
    const messages = listPayload.messages ?? [];

    return Promise.all(messages.slice(0, maxResults).map(async (message) => {
      const detailResponse = await proxyFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
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
    url.searchParams.set('fields', 'items(id,summary,description,start(date,dateTime),end(date,dateTime),attendees(email))');

    const response = await proxyFetch(url.toString(), {
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
      rawMetadataJson: sanitizeCalendarEventMetadata(event),
    }));
  },
};

function sanitizeCalendarEventMetadata(event: {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string }>;
}): unknown {
  return {
    id: event.id,
    ...(event.summary ? { summary: event.summary } : {}),
    ...(event.description ? { description: event.description } : {}),
    start: {
      ...(event.start?.date ? { date: event.start.date } : {}),
      ...(event.start?.dateTime ? { dateTime: event.start.dateTime } : {}),
    },
    end: {
      ...(event.end?.date ? { date: event.end.date } : {}),
      ...(event.end?.dateTime ? { dateTime: event.end.dateTime } : {}),
    },
    attendees: (event.attendees ?? [])
      .map((attendee) => attendee.email)
      .filter((email): email is string => Boolean(email))
      .map((email) => ({ email })),
  };
}

function splitAddresses(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseDateHeader(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function sendGmailReply(input: {
  accessToken: string;
  threadId: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string }> {
  // Construct RFC 2822 email
  const emailLines = [
    `To: ${input.to}`,
    `Subject: Re: ${input.subject.replace(/^Re:\s*/i, '')}`,
    `Content-Type: text/plain; charset=utf-8`,
    `In-Reply-To: ${input.threadId}`,
    `References: ${input.threadId}`,
    '',
    input.body,
  ];
  const rawEmail = emailLines.join('\r\n');
  const encodedEmail = Buffer.from(rawEmail).toString('base64url');

  const response = await proxyFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      raw: encodedEmail,
      threadId: input.threadId,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gmail send failed: ${response.status} ${errorBody}`);
  }

  const result = (await response.json()) as { id?: string };
  return { messageId: result.id ?? '' };
}
