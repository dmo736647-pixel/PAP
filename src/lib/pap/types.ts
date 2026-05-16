export type RiskLevel = 'low' | 'medium' | 'high';

export type EmailCategory =
  | 'important'
  | 'meeting'
  | 'newsletter'
  | 'notification'
  | 'marketing'
  | 'receipt'
  | 'unknown';

export type SuggestedActionType =
  | 'archive'
  | 'label'
  | 'summarize'
  | 'draft_reply'
  | 'send_acknowledgement'
  | 'recommend_meeting_times'
  | 'force_confirmation';

export type AutomationPermission =
  | 'archive_marketing'
  | 'summarize_newsletters'
  | 'send_simple_acknowledgement'
  | 'accept_whitelisted_low_risk_meetings';

export interface Contact {
  email: string;
  name: string;
  importance: 'normal' | 'important';
  alwaysConfirm: boolean;
  timeZone?: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  receivedAt: string;
  labels: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  attendees: string[];
}

export interface UserPreferences {
  userId: string;
  timeZone: string;
  workHours: {
    startHour: number;
    endHour: number;
  };
  deepWorkHours: Array<{
    startHour: number;
    endHour: number;
  }>;
  preferredTone: 'concise' | 'formal' | 'friendly' | 'assertive' | 'indirect';
  automationPermissions: AutomationPermission[];
  highRiskKeywords: string[];
  contacts: Contact[];
}

export interface RiskAssessment {
  level: RiskLevel;
  reasons: string[];
  requiresConfirmation: boolean;
}

export interface TriagedEmail {
  email: EmailMessage;
  category: EmailCategory;
  importanceScore: number;
  needsReply: boolean;
  hasMeetingIntent: boolean;
  risk: RiskAssessment;
}

export interface SuggestedAction {
  id: string;
  emailId: string;
  type: SuggestedActionType;
  title: string;
  summary: string;
  rationale: string;
  riskLevel: RiskLevel;
  requiresConfirmation: boolean;
  canUndo: boolean;
}

export interface MeetingSuggestion {
  emailId: string;
  title: string;
  proposedSlots: Array<{
    startsAt: string;
    endsAt: string;
    rationale: string;
  }>;
}

export type PapConnectionStatus = 'demo' | 'not_connected' | 'connected' | 'error';

export interface PapIntegrationStatus {
  source: 'demo_data' | 'live_google';
  gmail: PapConnectionStatus;
  calendar: PapConnectionStatus;
  storage: 'browser_local' | 'server';
  automationMode: 'confirmation_only' | 'live_actions';
}

export interface DailyBriefing {
  date: string;
  topPriorities: string[];
  importantEmails: TriagedEmail[];
  pendingConfirmations: SuggestedAction[];
  automaticallyHandled: SuggestedAction[];
  meetingSuggestions: MeetingSuggestion[];
  lowValueHandledCount: number;
}
