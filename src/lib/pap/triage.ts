import { assessEmailRisk } from './risk';
import type {
  EmailCategory,
  EmailMessage,
  SuggestedAction,
  TriagedEmail,
  UserPreferences,
} from './types';

const meetingWords = ['meeting', 'meet', 'call', 'schedule', 'calendar', 'zoom', 'next week'];
const marketingWords = ['unsubscribe', 'limited offer', 'promotion', 'sale'];
const newsletterWords = ['digest', 'newsletter', 'weekly update'];
const receiptWords = ['receipt', 'invoice', 'paid', 'payment received'];
const replyWords = ['can you', 'could you', 'please', 'let me know', 'confirm'];

export function triageEmail(email: EmailMessage, preferences: UserPreferences): TriagedEmail {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const category = classifyEmail(text);
  const contact = preferences.contacts.find(
    (candidate) => candidate.email.toLowerCase() === email.from.toLowerCase(),
  );
  const hasMeetingIntent = meetingWords.some((word) => text.includes(word));
  const needsReply = hasMeetingIntent || replyWords.some((word) => text.includes(word));
  const risk = assessEmailRisk(email, preferences);

  let importanceScore = 30;
  if (category === 'marketing' || category === 'newsletter') importanceScore = 10;
  if (category === 'receipt' || category === 'notification') importanceScore = 20;
  if (hasMeetingIntent) importanceScore = 60;
  if (contact?.importance === 'important') importanceScore = 85;
  if (risk.level === 'high') importanceScore = 95;

  return {
    email,
    category,
    importanceScore,
    needsReply,
    hasMeetingIntent,
    risk,
  };
}

export function createSuggestedAction(
  triaged: TriagedEmail,
  preferences: UserPreferences,
): SuggestedAction {
  const contact = preferences.contacts.find(
    (candidate) => candidate.email.toLowerCase() === triaged.email.from.toLowerCase(),
  );
  const displayName = contact?.name ?? triaged.email.from;

  if (triaged.risk.requiresConfirmation) {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'force_confirmation',
      title: `Review important email from ${displayName}`,
      summary: triaged.email.subject,
      rationale: triaged.risk.reasons.join('; '),
      riskLevel: triaged.risk.level,
      requiresConfirmation: true,
      canUndo: false,
    };
  }

  if (triaged.hasMeetingIntent) {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'recommend_meeting_times',
      title: `Suggest meeting times for ${displayName}`,
      summary: triaged.email.subject,
      rationale: 'Email appears to request scheduling support.',
      riskLevel: 'medium',
      requiresConfirmation: true,
      canUndo: false,
    };
  }

  if (
    triaged.category === 'marketing' &&
    preferences.automationPermissions.includes('archive_marketing')
  ) {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'archive',
      title: 'Archive low-value marketing email',
      summary: triaged.email.subject,
      rationale: 'Marketing email matched an allowed automation rule.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  if (
    triaged.category === 'newsletter' &&
    preferences.automationPermissions.includes('summarize_newsletters')
  ) {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'summarize',
      title: 'Summarize newsletter',
      summary: triaged.email.subject,
      rationale: 'Newsletter matched an allowed summarization rule.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: false,
    };
  }

  return {
    id: `action_${triaged.email.id}`,
    emailId: triaged.email.id,
    type: 'label',
    title: 'Label for later review',
    summary: triaged.email.subject,
    rationale: 'No automatic action matched, so PAP keeps it visible.',
    riskLevel: triaged.risk.level,
    requiresConfirmation: triaged.needsReply,
    canUndo: true,
  };
}

function classifyEmail(text: string): EmailCategory {
  if (meetingWords.some((word) => text.includes(word))) return 'meeting';
  if (marketingWords.some((word) => text.includes(word))) return 'marketing';
  if (newsletterWords.some((word) => text.includes(word))) return 'newsletter';
  if (receiptWords.some((word) => text.includes(word))) return 'receipt';
  if (text.includes('alert') || text.includes('notification')) return 'notification';
  return 'unknown';
}
