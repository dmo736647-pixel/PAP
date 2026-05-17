import type { CalendarEvent, EmailMessage } from './types';

export type GoogleEmailSnapshotLike = {
  id: string;
  googleMessageId: string;
  threadId: string;
  from: string;
  to: unknown;
  subject: string;
  snippet: string;
  receivedAt: Date;
  labels: unknown;
};

export type GoogleCalendarEventSnapshotLike = {
  id: string;
  googleEventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  attendees: unknown;
};

export function emailSnapshotToEmailMessage(snapshot: GoogleEmailSnapshotLike): EmailMessage {
  return {
    id: snapshot.googleMessageId,
    threadId: snapshot.threadId,
    from: extractEmailAddress(snapshot.from),
    to: stringArray(snapshot.to),
    subject: snapshot.subject,
    body: snapshot.snippet,
    receivedAt: snapshot.receivedAt.toISOString(),
    labels: stringArray(snapshot.labels),
  };
}

export function calendarSnapshotToCalendarEvent(snapshot: GoogleCalendarEventSnapshotLike): CalendarEvent {
  return {
    id: snapshot.googleEventId,
    title: snapshot.title,
    startsAt: snapshot.startsAt.toISOString(),
    endsAt: snapshot.endsAt.toISOString(),
    attendees: stringArray(snapshot.attendees),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}
