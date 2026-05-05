import { createDailyBriefing } from './briefing';
import { sampleCalendarEvents, sampleEmails, samplePreferences } from './fixtures';
import { createMeetingSuggestions } from './meetings';
import { createSuggestedAction, triageEmail } from './triage';
import type { DailyBriefing, UserPreferences } from './types';

export function runPapV1Pipeline(preferences: UserPreferences = samplePreferences): DailyBriefing {
  const triagedEmails = sampleEmails.map((email) => triageEmail(email, preferences));
  const actions = triagedEmails.map((triaged) => createSuggestedAction(triaged, preferences));
  const meetingSuggestions = createMeetingSuggestions(
    triagedEmails,
    sampleCalendarEvents,
    preferences,
  );

  return createDailyBriefing({
    now: '2026-05-04T12:00:00.000Z',
    triagedEmails,
    actions,
    meetingSuggestions,
  });
}
