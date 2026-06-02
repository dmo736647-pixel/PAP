import type { DailyBriefing, MeetingSuggestion, SuggestedAction, TriagedEmail } from './types';

export function createDailyBriefing(input: {
  now: string;
  triagedEmails: TriagedEmail[];
  actions: SuggestedAction[];
  meetingSuggestions: MeetingSuggestion[];
}): DailyBriefing {
  const pendingConfirmations = input.actions.filter((action) => action.requiresConfirmation);
  const automaticallyHandled = input.actions.filter((action) => !action.requiresConfirmation);
  const importantEmails = input.triagedEmails
    .filter((email) => email.importanceScore >= 80)
    .sort((left, right) => right.importanceScore - left.importanceScore);
  const lowValueHandledCount = automaticallyHandled.filter(
    (action) => action.type === 'archive' || action.type === 'summarize',
  ).length;

  return {
    date: input.now.slice(0, 10),
    topPriorities: createTopPriorities(
      pendingConfirmations,
      input.meetingSuggestions,
      lowValueHandledCount,
    ),
    importantEmails,
    allTriagedEmails: input.triagedEmails,
    pendingConfirmations,
    automaticallyHandled,
    meetingSuggestions: input.meetingSuggestions,
    lowValueHandledCount,
  };
}

function createTopPriorities(
  pendingConfirmations: SuggestedAction[],
  meetingSuggestions: MeetingSuggestion[],
  lowValueHandledCount: number,
): string[] {
  const priorities: string[] = [];

  for (const action of pendingConfirmations.slice(0, 2)) {
    priorities.push(action.title);
  }

  for (const suggestion of meetingSuggestions.slice(0, 2)) {
    priorities.push(suggestion.title);
  }

  if (lowValueHandledCount > 0) {
    priorities.push(`PAP automatically handled ${lowValueHandledCount} low-value item.`);
  }

  return priorities.slice(0, 5);
}
