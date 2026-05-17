import { createDailyBriefing } from './briefing';
import { createMeetingSuggestions } from './meetings';
import { createSuggestedAction, triageEmail } from './triage';
import { calendarSnapshotToCalendarEvent, emailSnapshotToEmailMessage, type GoogleCalendarEventSnapshotLike, type GoogleEmailSnapshotLike } from './google-snapshots';
import type { DailyBriefing, UserPreferences } from './types';

export function createGoogleWorkspaceBriefing(input: {
  now: string;
  preferences: UserPreferences;
  emailSnapshots: GoogleEmailSnapshotLike[];
  calendarSnapshots: GoogleCalendarEventSnapshotLike[];
}): DailyBriefing {
  const emails = input.emailSnapshots.map(emailSnapshotToEmailMessage);
  const events = input.calendarSnapshots.map(calendarSnapshotToCalendarEvent);
  const triagedEmails = emails.map((email) => triageEmail(email, input.preferences));
  const actions = triagedEmails.map((triaged) => createSuggestedAction(triaged, input.preferences));
  const meetingSuggestions = createMeetingSuggestions(triagedEmails, events, input.preferences, input.now);

  return createDailyBriefing({
    now: input.now,
    triagedEmails,
    actions,
    meetingSuggestions,
  });
}
