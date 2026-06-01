import { assessEmailRisk } from './risk';
import type {
  EmailCategory,
  EmailMessage,
  SuggestedAction,
  TriagedEmail,
  UserPreferences,
} from './types';

// ── Gmail label → category mapping ────────────────────────────────
const gmailLabelMap: Record<string, EmailCategory> = {
  CATEGORY_PROMOTIONS: 'marketing',
  CATEGORY_SOCIAL: 'social',
  CATEGORY_UPDATES: 'notification',
  CATEGORY_FORUMS: 'notification',
};

// ── Keyword dictionaries ──────────────────────────────────────────

const verificationWords = [
  'verification code', 'verify your', 'verify your email', 'verify your account',
  'one-time passcode', 'one time passcode', 'otp', 'one-time code',
  'security code', 'confirm your email', 'confirm your account',
  'confirm your identity', 'two-factor', '2fa', 'two factor',
  'sign-in code', 'login code', 'authentication code',
  'your code is', 'your verification', '验证码', '安全码',
  'confirm your subscription', 'email verification',
  'account verification', 'identity verification',
  'magic link', 'sign in link', 'login link',
];

const marketingWords = [
  // English
  'unsubscribe', 'limited offer', 'promotion', 'sale', 'flash sale',
  'exclusive deal', 'discount', 'coupon', 'promo code', '% off',
  'save now', 'shop now', 'buy now', 'order now', 'deal of the day',
  'special pricing', 'new arrivals', 'clearance', 'free shipping',
  'act now', 'don\'t miss', 'last chance', 'hurry', 'expires',
  'black friday', 'cyber monday', 'holiday sale', 'gift guide',
  'subscribe and save', 'try free', 'free trial', 'get started',
  'upgrade now', 'premium offer', 'limited time', 'today only',
  'reward points', 'cashback', 'referral bonus',
  // Chinese
  '优惠', '促销', '折扣', '限时', '特价', '秒杀', '抢购',
  '免费领取', '红包', '返现', '满减', '包邮', '新品',
];

const newsletterWords = [
  'digest', 'newsletter', 'weekly update', 'weekly roundup',
  'monthly update', 'daily briefing', 'morning brief',
  'this week', 'this month', 'roundup', 'recap',
  'trending', 'top stories', 'highlights', 'editor\'s pick',
  'curated', 'what\'s new', 'latest news', 'update from',
  'weekly summary', 'monthly summary', 'weekly report',
  'your weekly', 'your daily', 'your monthly',
];

const receiptWords = [
  'receipt', 'invoice', 'paid', 'payment received',
  'order confirmation', 'order confirmed', 'your order',
  'shipping confirmation', 'has shipped', 'tracking number',
  'delivery update', 'out for delivery', 'delivered',
  'your payment', 'payment successful', 'transaction',
  'subscription renewal', 'billing statement', 'charge',
  'refund', 'refund processed', 'return confirmation',
  '购买成功', '支付成功', '订单确认', '发货通知', '已发货',
];

const socialWords = [
  'liked your', 'commented on', 'mentioned you', 'tagged you',
  'shared your', 'new follower', 'new connection', 'friend request',
  'wants to connect', 'reacted to', 'replied to your',
  'someone liked', 'new message from', 'sent you a message',
  'invited you to', 'wants to follow', 'started following',
];

const notificationWords = [
  'alert', 'notification', 'reminder', 'automated message',
  'do not reply', 'no-reply', 'noreply', 'this is an automated',
  'system notification', 'service update', 'scheduled maintenance',
  'out of office', 'auto-reply', 'automatic reply', 'away message',
  'bounce', 'delivery failed', 'undeliverable', 'mail delivery',
  'password changed', 'password reset', 'security alert',
  'new sign-in', 'suspicious activity', 'account activity',
  'terms of service', 'privacy policy', 'policy update',
  'account settings changed', 'new device', 'unusual activity',
];

const spamWords = [
  'congratulations', 'you won', 'you\'ve been selected',
  'claim your prize', 'lottery', 'inheritance', 'million dollars',
  'urgent assistance', 'dear friend', 'dear beloved',
  'wire transfer', 'western union', 'nigerian prince',
  'click here immediately', 'act immediately', 'limited spots',
  'make money fast', 'work from home', 'earn extra',
  'weight loss', 'miracle cure', 'enlargement',
  'casino', 'bet now', 'free money', 'risk free',
];

const meetingWords = [
  'meeting', 'meet ', 'call with', 'schedule a call',
  'calendar invite', 'zoom meeting', 'google meet',
  'teams meeting', 'video call', 'conference call',
  'let\'s meet', 'available for a call', 'book a time',
  'schedule a meeting', 'meeting request', 'invite to meeting',
  'join the meeting', 'meeting link', 'meeting room',
];

const replyWords = [
  'can you', 'could you', 'please review', 'please confirm',
  'let me know', 'looking forward to your', 'awaiting your',
  'need your input', 'need your response', 'thoughts on',
  'what do you think', 'please advise', 'please respond',
  'follow up', 'following up', 'circling back',
  'action required', 'action needed', 'your approval',
  'waiting for your', 'pending your', 'by end of day',
  'eod', 'asap', 'urgent', 'time sensitive',
];

// ── Classification engine ─────────────────────────────────────────

function classifyByGmailLabels(labels: string[]): EmailCategory | null {
  for (const label of labels) {
    const category = gmailLabelMap[label];
    if (category) return category;
  }
  return null;
}

function classifyByKeywords(text: string): EmailCategory {
  // Meeting words — check early but with stricter matching
  if (meetingWords.some((word) => text.includes(word))) return 'meeting';

  // Verification codes are the most deterministic
  if (verificationWords.some((word) => text.includes(word))) return 'verification_code';

  // Spam patterns — check before marketing since spam often contains marketing words
  if (spamWords.some((word) => text.includes(word))) return 'spam';

  // Receipts are high-signal
  if (receiptWords.some((word) => text.includes(word))) return 'receipt';

  // Social media notifications
  if (socialWords.some((word) => text.includes(word))) return 'social';

  // Marketing — expanded keyword list
  if (marketingWords.some((word) => text.includes(word))) return 'marketing';

  // Newsletters
  if (newsletterWords.some((word) => text.includes(word))) return 'newsletter';

  // System notifications
  if (notificationWords.some((word) => text.includes(word))) return 'notification';

  return 'unknown';
}

function classifyEmail(text: string, labels: string[]): EmailCategory {
  // 1. Try Gmail labels first (most reliable signal from Google)
  const labelCategory = classifyByGmailLabels(labels);
  if (labelCategory) return labelCategory;

  // 2. Fall back to keyword matching
  return classifyByKeywords(text);
}

// ── Meeting intent — only on genuine conversation emails ──────────

function detectMeetingIntent(text: string, category: EmailCategory): boolean {
  // Never flag meeting intent on low-value categories
  const lowValueCategories: EmailCategory[] = [
    'marketing', 'newsletter', 'notification', 'receipt',
    'verification_code', 'social', 'spam',
  ];
  if (lowValueCategories.includes(category)) return false;

  return meetingWords.some((word) => text.includes(word));
}

function detectNeedsReply(text: string, category: EmailCategory, hasMeetingIntent: boolean): boolean {
  // Low-value emails never need a reply
  const lowValueCategories: EmailCategory[] = [
    'marketing', 'newsletter', 'notification', 'receipt',
    'verification_code', 'social', 'spam',
  ];
  if (lowValueCategories.includes(category)) return false;

  if (hasMeetingIntent) return true;
  return replyWords.some((word) => text.includes(word));
}

// ── Main triage function ──────────────────────────────────────────

export function triageEmail(email: EmailMessage, preferences: UserPreferences): TriagedEmail {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const category = classifyEmail(text, email.labels);
  const contact = preferences.contacts.find(
    (candidate) => candidate.email.toLowerCase() === email.from.toLowerCase(),
  );
  const hasMeetingIntent = detectMeetingIntent(text, category);
  const needsReply = detectNeedsReply(text, category, hasMeetingIntent);

  // Low-value categories: skip risk assessment entirely — Gmail/category already decided
  const lowValueCategories: EmailCategory[] = [
    'marketing', 'newsletter', 'notification', 'receipt',
    'verification_code', 'social', 'spam',
  ];
  const isLowValue = lowValueCategories.includes(category);

  const risk = isLowValue
    ? { level: 'low' as const, reasons: ['Low-value category — auto-handled.'], requiresConfirmation: false }
    : assessEmailRisk(email, preferences);

  let importanceScore = 30;

  // Low-value categories get minimal scores
  if (category === 'spam') importanceScore = 0;
  if (category === 'verification_code') importanceScore = 5;
  if (category === 'marketing' || category === 'newsletter') importanceScore = 10;
  if (category === 'social') importanceScore = 15;
  if (category === 'receipt' || category === 'notification') importanceScore = 20;
  if (category === 'unknown') importanceScore = 25;

  // Elevated signals (only for non-low-value categories)
  if (!isLowValue && hasMeetingIntent) importanceScore = 60;
  if (!isLowValue && needsReply && !hasMeetingIntent) importanceScore = Math.max(importanceScore, 50);

  // Contact importance override (but not for low-value categories)
  if (!isLowValue && contact?.importance === 'important') importanceScore = 85;
  if (!isLowValue && risk.level === 'high') importanceScore = 95;

  return {
    email,
    category,
    importanceScore,
    needsReply,
    hasMeetingIntent,
    risk,
  };
}

// ── Action creation ───────────────────────────────────────────────

export function createSuggestedAction(
  triaged: TriagedEmail,
  preferences: UserPreferences,
): SuggestedAction {
  const contact = preferences.contacts.find(
    (candidate) => candidate.email.toLowerCase() === triaged.email.from.toLowerCase(),
  );
  const displayName = contact?.name ?? triaged.email.from;

  // Priority 1: High-risk emails from known contacts need human review
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

  // Priority 2: Meeting scheduling (only on genuine conversation emails)
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

  // Priority 3: Verification codes — auto-archive silently
  if (triaged.category === 'verification_code') {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'archive',
      title: 'Auto-archived verification code',
      summary: triaged.email.subject,
      rationale: 'Verification/OTP email — no action needed after use.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  // Priority 4: Spam — auto-archive
  if (triaged.category === 'spam') {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'archive',
      title: 'Auto-archived spam',
      summary: triaged.email.subject,
      rationale: 'Matched spam patterns — likely unsolicited or fraudulent.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  // Priority 5: Marketing — auto-archive if permitted
  if (
    triaged.category === 'marketing' &&
    preferences.automationPermissions.includes('archive_marketing')
  ) {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'archive',
      title: 'Auto-archived marketing email',
      summary: triaged.email.subject,
      rationale: 'Marketing email matched an allowed automation rule.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  // Priority 6: Newsletters — summarize if permitted
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

  // Priority 7: Social notifications — auto-label
  if (triaged.category === 'social') {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'label',
      title: 'Auto-labeled social notification',
      summary: triaged.email.subject,
      rationale: 'Social media notification — low priority.',
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  // Priority 8: System notifications, receipts — auto-label
  if (triaged.category === 'notification' || triaged.category === 'receipt') {
    return {
      id: `action_${triaged.email.id}`,
      emailId: triaged.email.id,
      type: 'label',
      title: 'Auto-labeled notification',
      summary: triaged.email.subject,
      rationale: `${triaged.category} email — informational only.`,
      riskLevel: 'low',
      requiresConfirmation: false,
      canUndo: true,
    };
  }

  // Default: Unknown emails — keep visible with low priority
  return {
    id: `action_${triaged.email.id}`,
    emailId: triaged.email.id,
    type: 'label',
    title: 'Label for later review',
    summary: triaged.email.subject,
    rationale: 'No automatic action matched, so PAP keeps it visible.',
    riskLevel: triaged.risk.level,
    requiresConfirmation: true,
    canUndo: true,
  };
}
