import { describe, expect, it } from 'vitest';
import { assessEmailRisk } from '../risk';
import type { EmailMessage, UserPreferences } from '../types';

const preferences: UserPreferences = {
  userId: 'user_1',
  timeZone: 'Europe/Berlin',
  workHours: { startHour: 9, endHour: 17 },
  deepWorkHours: [{ startHour: 9, endHour: 11 }],
  preferredTone: 'concise',
  automationPermissions: ['archive_marketing', 'summarize_newsletters'],
  highRiskKeywords: ['contract', 'payment', 'quote', 'legal', 'passport'],
  contacts: [
    {
      email: 'founder@example.com',
      name: 'Founder',
      importance: 'important',
      alwaysConfirm: true,
      timeZone: 'America/New_York',
    },
  ],
};

function email(overrides: Partial<EmailMessage>): EmailMessage {
  return {
    id: 'email_1',
    threadId: 'thread_1',
    from: 'newsletter@example.com',
    to: ['me@example.com'],
    subject: 'Weekly product digest',
    body: 'Here are this week updates.',
    receivedAt: '2026-05-04T08:00:00.000Z',
    labels: [],
    ...overrides,
  };
}

describe('assessEmailRisk', () => {
  it('forces confirmation for high-risk keywords', () => {
    const result = assessEmailRisk(
      email({ subject: 'Contract and payment terms', body: 'Please confirm the quote.' }),
      preferences,
    );

    expect(result.level).toBe('high');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.reasons).toContain('Contains high-risk keyword: contract');
    expect(result.reasons).toContain('Contains high-risk keyword: payment');
  });

  it('forces confirmation for always-confirm contacts', () => {
    const result = assessEmailRisk(
      email({ from: 'founder@example.com', subject: 'Quick update', body: 'Can you review this?' }),
      preferences,
    );

    expect(result.level).toBe('medium');
    expect(result.requiresConfirmation).toBe(true);
    expect(result.reasons).toContain('Sender is marked as always-confirm');
  });

  it('allows low-risk newsletter handling', () => {
    const result = assessEmailRisk(email({}), preferences);

    expect(result.level).toBe('low');
    expect(result.requiresConfirmation).toBe(false);
    expect(result.reasons).toEqual(['No high-risk triggers found']);
  });
});
