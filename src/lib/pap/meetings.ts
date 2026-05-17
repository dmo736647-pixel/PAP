import type { CalendarEvent, MeetingSuggestion, TriagedEmail, UserPreferences } from './types';

export function createMeetingSuggestions(
  triagedEmails: TriagedEmail[],
  events: CalendarEvent[],
  preferences: UserPreferences,
  now = '2026-05-05T00:00:00.000Z',
): MeetingSuggestion[] {
  return triagedEmails
    .filter((triaged) => triaged.hasMeetingIntent)
    .map((triaged) => ({
      emailId: triaged.email.id,
      title: `Coordinate meeting: ${triaged.email.subject}`,
      proposedSlots: findCandidateSlots(events, preferences, now).slice(0, 3),
    }));
}

function findCandidateSlots(
  events: CalendarEvent[],
  preferences: UserPreferences,
  now: string,
): MeetingSuggestion['proposedSlots'] {
  const nowDate = new Date(now);
  const baseDate = new Date(now);
  const slots: MeetingSuggestion['proposedSlots'] = [];

  for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
    for (let hour = preferences.workHours.startHour; hour < preferences.workHours.endHour; hour += 2) {
      const startsAt = new Date(baseDate);
      startsAt.setUTCDate(baseDate.getUTCDate() + dayOffset);
      startsAt.setUTCHours(hour, 0, 0, 0);

      const endsAt = new Date(startsAt);
      endsAt.setUTCHours(startsAt.getUTCHours() + 1);

      if (startsAt <= nowDate) continue;
      if (overlapsAnyEvent(startsAt, endsAt, events)) continue;
      if (overlapsDeepWork(startsAt, preferences)) continue;

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        rationale: 'Open work-hour slot that avoids existing events and deep work blocks.',
      });
    }
  }

  return slots;
}

function overlapsAnyEvent(startsAt: Date, endsAt: Date, events: CalendarEvent[]): boolean {
  return events.some((event) => {
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);
    return startsAt < eventEnd && endsAt > eventStart;
  });
}

function overlapsDeepWork(startsAt: Date, preferences: UserPreferences): boolean {
  const hour = startsAt.getUTCHours();
  return preferences.deepWorkHours.some(
    (block) => hour >= block.startHour && hour < block.endHour,
  );
}
