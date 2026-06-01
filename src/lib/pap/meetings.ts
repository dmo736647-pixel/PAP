import type { CalendarEvent, Contact, MeetingSuggestion, TriagedEmail, UserPreferences } from './types';

export function createMeetingSuggestions(
  triagedEmails: TriagedEmail[],
  events: CalendarEvent[],
  preferences: UserPreferences,
  now = '2026-05-05T00:00:00.000Z',
): MeetingSuggestion[] {
  return triagedEmails
    .filter((triaged) => triaged.hasMeetingIntent)
    .map((triaged) => {
      const contact = preferences.contacts.find(
        (c) => c.email.toLowerCase() === triaged.email.from.toLowerCase(),
      );
      const participantName = contact?.name ?? extractNameFromEmail(triaged.email.from);
      const participantEmail = triaged.email.from;
      const userTimeZone = preferences.timeZone;
      const proposedSlots = findCandidateSlots(events, preferences, userTimeZone, now).slice(0, 9);
      const draftReply = generateDraftReply(
        participantName,
        triaged.email.subject,
        proposedSlots,
        userTimeZone,
      );

      return {
        emailId: triaged.email.id,
        title: `Coordinate meeting: ${triaged.email.subject}`,
        participantName,
        participantEmail,
        userTimeZone,
        draftReply,
        proposedSlots,
      };
    });
}

function extractNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  // Convert common patterns: "john.doe" → "John Doe", "johndoe" → "Johndoe"
  return local
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateDraftReply(
  participantName: string,
  subject: string,
  slots: MeetingSuggestion['proposedSlots'],
  userTimeZone: string,
): string {
  if (slots.length === 0) {
    return `Hi ${participantName},\n\nThanks for reaching out. Let me check my calendar and get back to you with some available times.\n\nBest regards`;
  }

  const slotLines = slots
    .map((slot, index) => {
      const time = formatSlotInZone(slot.startsAt, slot.endsAt, userTimeZone);
      return `  ${index + 1}. ${time}`;
    })
    .join('\n');

  return `Hi ${participantName},\n\nThanks for reaching out about "${subject}". Here are a few times that work for me:\n\n${slotLines}\n\nPlease let me know which works best for you.\n\nBest regards`;
}

function formatSlotInZone(startsAt: string, endsAt: string, timeZone: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const startTime = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start);
  const endTime = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(end);

  return `${dateFormatter.format(start)}, ${startTime}–${endTime}`;
}

export function findCandidateSlots(
  events: CalendarEvent[],
  preferences: UserPreferences,
  timeZone: string,
  now: string,
): MeetingSuggestion['proposedSlots'] {
  const nowDate = new Date(now);
  const slots: MeetingSuggestion['proposedSlots'] = [];

  for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
    for (let hour = preferences.workHours.startHour; hour < preferences.workHours.endHour; hour += 2) {
      // Build slot in the user's timezone, then convert to UTC for comparison
      const slotDate = new Date(nowDate);
      slotDate.setUTCDate(nowDate.getUTCDate() + dayOffset);

      // Get the UTC offset for the target timezone on this date
      const startsAt = localTimeToUtc(slotDate, hour, 0, timeZone);
      const endsAt = localTimeToUtc(slotDate, hour + 1, 0, timeZone);

      if (startsAt <= nowDate) continue;
      if (overlapsAnyEvent(startsAt, endsAt, events)) continue;
      if (overlapsDeepWork(hour, preferences)) continue;

      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        rationale: `Open work-hour slot that avoids existing events and deep work blocks.`,
      });
    }
  }

  return slots;
}

function localTimeToUtc(baseDate: Date, hour: number, minute: number, timeZone: string): Date {
  // Create a date string in the target timezone and parse it as UTC
  const year = baseDate.getUTCFullYear();
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getUTCDate()).padStart(2, '0');
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');

  // Use Intl to get the offset for this timezone at this date/time
  const tempDate = new Date(`${year}-${month}-${day}T${h}:${m}:00`);

  // Format in the target timezone to get the UTC equivalent
  const utcFormatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Reverse-engineer: create a date that, when displayed in the target timezone,
  // shows the desired local time
  // Simple approach: iterate to find the UTC time that displays as the desired local time
  const guess = new Date(`${year}-${month}-${day}T${h}:${m}:00Z`);
  const parts = utcFormatted.formatToParts(guess);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  // The difference between what we want and what the guess produces tells us the offset
  const displayedHour = getPart('hour');
  const displayedDay = getPart('day');

  let hourDiff = displayedHour - hour;
  if (displayedDay !== parseInt(day, 10)) {
    // Day boundary crossed
    hourDiff += displayedDay > parseInt(day, 10) ? -24 : 24;
  }

  const result = new Date(guess.getTime() - hourDiff * 60 * 60 * 1000);
  result.setUTCMinutes(minute);
  result.setUTCSeconds(0);
  result.setUTCMilliseconds(0);

  return result;
}

function overlapsAnyEvent(startsAt: Date, endsAt: Date, events: CalendarEvent[]): boolean {
  return events.some((event) => {
    const eventStart = new Date(event.startsAt);
    const eventEnd = new Date(event.endsAt);
    return startsAt < eventEnd && endsAt > eventStart;
  });
}

function overlapsDeepWork(hour: number, preferences: UserPreferences): boolean {
  return preferences.deepWorkHours.some(
    (block) => hour >= block.startHour && hour < block.endHour,
  );
}
