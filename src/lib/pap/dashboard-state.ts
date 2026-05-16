export type ActionStatus = 'confirmed' | 'rejected' | 'undone' | 'wrong' | 'alwaysAsk' | 'slotUsed' | 'moreOptions';

export type AuditEventType = ActionStatus | 'draftEdited' | 'settingsChanged';

export type ActionResult = {
  id: string;
  title: string;
  status: ActionStatus;
};

export type AuditEvent = {
  id: string;
  actionId: string;
  actionTitle: string;
  eventType: AuditEventType;
  createdAt: string;
};
