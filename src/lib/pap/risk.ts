import type { EmailMessage, RiskAssessment, UserPreferences } from './types';

export function assessEmailRisk(email: EmailMessage, preferences: UserPreferences): RiskAssessment {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const reasons: string[] = [];

  for (const keyword of preferences.highRiskKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      reasons.push(`Contains high-risk keyword: ${keyword}`);
    }
  }

  const contact = preferences.contacts.find(
    (candidate) => candidate.email.toLowerCase() === email.from.toLowerCase(),
  );

  if (contact?.alwaysConfirm) {
    reasons.push('Sender is marked as always-confirm');
  }

  if (reasons.some((reason) => reason.startsWith('Contains high-risk keyword:'))) {
    return {
      level: 'high',
      reasons,
      requiresConfirmation: true,
    };
  }

  if (contact?.alwaysConfirm) {
    return {
      level: 'medium',
      reasons,
      requiresConfirmation: true,
    };
  }

  return {
    level: 'low',
    reasons: ['No high-risk triggers found'],
    requiresConfirmation: false,
  };
}
