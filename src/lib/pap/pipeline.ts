import { createDailyBriefing } from './briefing';
import { sampleCalendarEvents, sampleEmails, samplePreferences } from './fixtures';
import { createMeetingSuggestions } from './meetings';
import { createSuggestedAction, triageEmail } from './triage';
import type { DailyBriefing } from './types';

export function runPapV1Pipeline(): DailyBriefing {
  const triagedEmails = sampleEmails.map((email) => triageEmail(email, samplePreferences));
  const actions = triagedEmails.map((triaged) => createSuggestedAction(triaged, samplePreferences));
  const meetingSuggestions = createMeetingSuggestions(
    triagedEmails,
    sampleCalendarEvents,
    samplePreferences,
  );

  return createDailyBriefing({
    now: '2026-05-04T12:00:00.000Z',
    triagedEmails,
    actions,
    meetingSuggestions,
  });
}
