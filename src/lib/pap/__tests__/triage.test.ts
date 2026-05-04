import { describe, expect, it } from 'vitest';
import { createSuggestedAction, triageEmail } from '../triage';
import type { EmailMessage, UserPreferences } from '../types';

const preferences: UserPreferences = {
  userId: 'user_1',
  timeZone: 'Europe/Berlin',
  workHours: { startHour: 9, endHour: 17 },
  deepWorkHours: [{ startHour: 9, endHour: 11 }],
  preferredTone: 'concise',
  automationPermissions: ['archive_marketing', 'summarize_newsletters', 'send_simple_acknowledgement'],
  highRiskKeywords: ['contract', 'payment', 'quote', 'legal', 'passport'],
  contacts: [
    { email: 'client@example.com', name: 'Client', importance: 'important', alwaysConfirm: true },
  ],
};

function email(overrides: Partial<EmailMessage>): EmailMessage {
  return {
    id: 'email_1',
    threadId: 'thread_1',
    from: 'sender@example.com',
    to: ['me@example.com'],
    subject: 'Hello',
    body: 'Can you take a look?',
    receivedAt: '2026-05-04T08:00:00.000Z',
    labels: [],
    ...overrides,
  };
}

describe('triageEmail', () => {
  it('classifies marketing email as low-value and automatable', () => {
    const result = triageEmail(
      email({ subject: 'Limited offer for your startup', body: 'Unsubscribe anytime.' }),
      preferences,
    );

    expect(result.category).toBe('marketing');
    expect(result.importanceScore).toBe(10);
    expect(result.needsReply).toBe(false);
    expect(result.risk.level).toBe('low');
  });

  it('classifies meeting requests', () => {
    const result = triageEmail(
      email({ subject: 'Meeting next week', body: 'Can we meet next Tuesday afternoon?' }),
      preferences,
    );

    expect(result.category).toBe('meeting');
    expect(result.hasMeetingIntent).toBe(true);
    expect(result.needsReply).toBe(true);
  });

  it('creates pending confirmation for important client email', () => {
    const triaged = triageEmail(
      email({ from: 'client@example.com', subject: 'Proposal timing', body: 'Can you commit to Friday?' }),
      preferences,
    );
    const action = createSuggestedAction(triaged, preferences);

    expect(action.type).toBe('force_confirmation');
    expect(action.requiresConfirmation).toBe(true);
    expect(action.title).toBe('Review important email from Client');
  });

  it('creates automatic archive action for marketing when allowed', () => {
    const triaged = triageEmail(
      email({ subject: 'Limited offer', body: 'Unsubscribe from this promotion.' }),
      preferences,
    );
    const action = createSuggestedAction(triaged, preferences);

    expect(action.type).toBe('archive');
    expect(action.requiresConfirmation).toBe(false);
    expect(action.canUndo).toBe(true);
  });
});
