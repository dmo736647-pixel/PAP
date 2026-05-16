'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { sampleEmails, samplePreferences } from '@/lib/pap/fixtures';
import { runPapV1Pipeline } from '@/lib/pap/pipeline';
import type {
  AutomationPermission,
  EmailMessage,
  MeetingSuggestion,
  PapIntegrationStatus,
  SuggestedAction,
  UserPreferences,
} from '@/lib/pap/types';

type Locale = 'zh' | 'en';
type ActionStatus = 'confirmed' | 'rejected' | 'undone' | 'wrong' | 'alwaysAsk' | 'slotUsed' | 'moreOptions';
type AuditEventType = ActionStatus | 'draftEdited' | 'settingsChanged';
type ActionResult = {
  id: string;
  title: string;
  status: ActionStatus;
};
type AuditEvent = {
  id: string;
  actionId: string;
  actionTitle: string;
  eventType: AuditEventType;
  createdAt: string;
};
type PersistedDashboardStateV1 = {
  version: 1;
  preferences: UserPreferences;
  actionResults: ActionResult[];
  auditEvents: AuditEvent[];
  editedDrafts: Record<string, string>;
};

type BoundaryChange = {
  title: string;
  update: (preferences: UserPreferences) => UserPreferences;
};

const storageKey = 'pap:v1:dashboard-state';
const demoIntegrationStatus: PapIntegrationStatus = {
  source: 'demo_data',
  gmail: 'not_connected',
  calendar: 'not_connected',
  storage: 'browser_local',
  automationMode: 'confirmation_only',
};
const defaultDashboardState: PersistedDashboardStateV1 = {
  version: 1,
  preferences: samplePreferences,
  actionResults: [],
  auditEvents: [],
  editedDrafts: {},
};

type LocalizedAction = {
  title: string;
  summary: string;
  rationale: string;
  sourceSummary: string;
  recommendation: string;
  riskNote: string;
  sourceSubject: string;
  ruleAction: string;
  preparedReply?: string;
  chips: string[];
};

type LocalizedMeeting = {
  title: string;
  requestSummary: string;
  participantLabel: string;
  userTimeZone: string;
  participantTimeZone: string;
  draftReply: string;
};

const copy = {
  zh: {
    oneLiner: '把邮件和日历变成少数待决定事项。',
    navToday: '今日',
    navPending: '待确认',
    navAutomated: '已处理',
    navMeetings: '会议',
    navBoundaries: '边界',
    demoWorkspace: '演示工作区',
    dataSource: '演示数据',
    gmailNotConnected: 'Gmail 未连接',
    calendarNotConnected: 'Calendar 未连接',
    browserOnly: '浏览器本地保存',
    safeMode: '确认后才执行',
    processed: '42 封邮件，只有 4 件需要你看',
    language: '语言',
    resetDemo: '重置演示数据',
    statusDetail: '低风险事项已自动归档或总结；重要回复和会议安排在下方等待确认。',
    originalSummary: '原邮件在说什么',
    papSuggestion: 'PAP 建议怎么做',
    confirmOutcome: '点确认会执行',
    confirmationReason: '为什么需要确认',
    boundaryAutoTitle: '这些 PAP 可以自动做',
    boundaryAskTitle: '这些必须先问我',
    boundaryNeverTitle: '这些永远不能做',
    todayBriefing: '今日简报',
    todayHeading: '今天有 {count} 件事需要你决定',
    todayClearedHeading: '今天的决策已清空',
    todaySubheading: 'PAP 已清掉低价值事项，把真正需要判断的动作放在前面。',
    todayClearedNote: 'PAP 会继续监控，新事项会再提醒你。',
    pendingMetric: '等你决定',
    handledMetric: '已替你清理',
    meetingMetric: '可安排会议',
    importantMetric: '重要邮件',
    meetingsDone: '会议协调已处理完。',
    topPriorities: '今天先看',
    pendingPreview: '确认队列摘要',
    autoSummary: '其余 {count} 个低价值事项已自动处理。',
    previewCta: '去确认',
    pending: '待你确认',
    pendingHeading: '这些动作等你点头',
    pendingDescription: 'PAP 已写好草稿；你只需要确认、修改或拒绝。',
    pendingQueueSummary: '先处理 {count} 个确认',
    pendingQueueTrust: '发送、承诺和改日历前都会停在这里。',
    pendingQueueCleared: '今天的确认已清空',
    pendingQueueClearedTrust: '发送、承诺和改日历仍会先停在这里。',
    recommendation: '建议动作',
    why: '为什么',
    riskNote: '风险',
    source: '来源',
    preparedDraft: 'PAP 准备发送',
    noDraftNeeded: '这个动作不需要发送回复。',
    originalEmail: '原邮件',
    showOriginal: '查看原邮件',
    hideOriginal: '收起原邮件',
    from: '发件人',
    to: '收件人',
    subject: '主题',
    confirm: '确认执行',
    edit: '先改一下',
    reject: '不要这样做',
    saveEdit: '保存修改',
    cancel: '取消',
    editLabel: '修改建议内容',
    neverSend: '发送和承诺类动作始终等你确认。',
    handled: '已自动处理',
    handledHeading: 'PAP 已替你清掉这些事',
    handledDescription: '只展示结果；需要时可撤销或纠正。',
    handledTrust: '没有代表你发送任何内容。',
    actionTaken: '结果',
    rule: '依据',
    undoAvailable: '可撤销',
    undoUnavailable: '不可撤销',
    undo: '撤销',
    wrong: '这次错了',
    alwaysAsk: '以后先问我',
    meeting: '会议协调',
    meetingHeading: '这些时间可以直接发',
    meetingDescription: 'PAP 已避开冲突、深度工作和时区误会。',
    recommendedSlots: '可选时间',
    preparedReply: '可直接发送的回复',
    useSlot: '使用第一个时间',
    editReply: '改回复',
    moreTimes: '换一批时间',
    boundaries: '自动化边界',
    boundariesDescription: '一句话看懂 PAP 能做、必须问、绝不能做什么。',
    googleConnection: 'Google 连接',
    googleConnectionHeading: 'Private alpha 会先做只读连接',
    googleConnectionDescription: '下一阶段会连接 Gmail 和 Google Calendar，用真实邮件和日历生成 briefing；发送邮件、修改日历仍会先停在确认队列。',
    googleConnectionButton: '即将支持 Google 连接',
    canDo: '自动做',
    mustAsk: '先问我',
    mustNever: '绝不能做',
    canDoText: '开启后，低风险组织类动作会进入“已自动处理”。',
    mustAskText: '这些联系人或场景会进入待确认，不会静默执行。',
    mustNeverText: '命中这些关键词时，PAP 会强制确认。',
    canDoExample: '关闭营销归档后，营销邮件会回到待处理视图。',
    mustAskExample: 'Maya + 合同时间 = 永远先问你。',
    mustNeverExample: '付款、合同、法律决定直接阻止。',
    enabled: '已开启',
    disabled: '已关闭',
    highRiskKeywords: '高风险关键词',
    addKeyword: '添加关键词',
    newKeyword: '新关键词',
    remove: '移除',
    workHours: '工作时间',
    deepWork: '深度工作',
    startHour: '开始',
    endHour: '结束',
    activity: '刚刚完成',
    outcomeTitle: 'PAP 刚刚完成并留痕',
    outcomeSummary: '本轮已完成 {count} 个动作 · 已留下 {count} 条记录',
    outcomeConfirmed: '已执行：{title}。待确认列表已更新，记录已保存。',
    outcomeRejected: '已拒绝：{title}。PAP 不会执行这一步，记录已保存。',
    outcomeDraftEdited: '草稿已保存：{title}。下次确认会使用修改版。',
    outcomeSettingsChanged: '边界已更新：{title}。以后会按新规则处理。',
    outcomeSlotUsed: '会议时间已选：{title}。可追踪记录已保存。',
    outcomeMoreOptions: '已请求更多时间：{title}。PAP 会继续找更合适的选项。',
    meetingInlineDone: '已选择这个会议时间，并保存到本地演示记录。',
    meetingInlineMore: '已请求更多时间，PAP 会继续找更合适的选项。',
    outcomeUndone: '已撤销：{title}。这次自动处理已回退并留痕。',
    outcomeWrong: '已记录纠正：{title}。PAP 会把这次反馈作为边界信号。',
    outcomeAlwaysAsk: '已记住偏好：{title}。以后类似事项会先问你。',
    localRecordSaved: '已保存到本地演示记录。',
    confirmedTitle: '已确认',
    rejectedTitle: '已拒绝',
    undoneTitle: '已撤销',
    wrongTitle: '已标记错误',
    alwaysAskTitle: '以后先问',
    slotUsedTitle: '已选择会议时间',
    moreOptionsTitle: '已请求更多时间',
    confirmedPrefix: '已确认：',
    rejectedPrefix: '已拒绝：',
    undonePrefix: '已撤销：',
    wrongPrefix: '已标记错误：',
    alwaysAskPrefix: '以后先问：',
    slotUsedPrefix: '已选择：',
    moreOptionsPrefix: '已请求更多选项：',
  },
  en: {
    oneLiner: 'Turn email and calendar into a few decisions.',
    navToday: 'Today',
    navPending: 'Pending',
    navAutomated: 'Handled',
    navMeetings: 'Meetings',
    navBoundaries: 'Rules',
    demoWorkspace: 'Demo workspace',
    dataSource: 'Demo data',
    gmailNotConnected: 'Gmail not connected',
    calendarNotConnected: 'Calendar not connected',
    browserOnly: 'Browser-local storage',
    safeMode: 'Runs after confirmation',
    processed: '42 emails, only 4 need your attention',
    language: 'Language',
    resetDemo: 'Reset demo',
    statusDetail: 'Low-risk items were archived or summarized; important replies and meeting coordination wait below for confirmation.',
    originalSummary: 'What the original email says',
    papSuggestion: 'What PAP recommends',
    confirmOutcome: 'What confirm will do',
    confirmationReason: 'Why confirmation is needed',
    boundaryAutoTitle: 'PAP can do these automatically',
    boundaryAskTitle: 'PAP must ask me first',
    boundaryNeverTitle: 'PAP must never do these',
    todayBriefing: 'Today Briefing',
    todayHeading: '{count} things need your decision today',
    todayClearedHeading: "Today's decisions are cleared",
    todaySubheading: 'PAP cleared low-value work and brought the real decisions forward.',
    todayClearedNote: 'PAP keeps monitoring and will surface new decisions.',
    pendingMetric: 'Need you',
    handledMetric: 'Cleared for you',
    meetingMetric: 'Ready meetings',
    importantMetric: 'Important emails',
    meetingsDone: 'Meeting coordination is done.',
    topPriorities: 'Start here',
    pendingPreview: 'Confirmation queue summary',
    autoSummary: '{count} low-value items were handled automatically.',
    previewCta: 'Review confirmations',
    pending: 'Pending Confirmation',
    pendingHeading: 'These actions need your yes',
    pendingDescription: 'PAP has prepared the drafts; you only confirm, edit, or reject.',
    pendingQueueSummary: 'Resolve {count} confirmations first',
    pendingQueueTrust: 'Sends, commitments, and calendar changes stop here first.',
    pendingQueueCleared: "Today's confirmations are cleared",
    pendingQueueClearedTrust: 'Sends, commitments, and calendar changes will still stop here.',
    recommendation: 'Suggested action',
    why: 'Why',
    riskNote: 'Risk',
    source: 'Source',
    preparedDraft: 'PAP prepared to send',
    noDraftNeeded: 'No outgoing reply needed for this action.',
    originalEmail: 'Original email',
    showOriginal: 'View original email',
    hideOriginal: 'Hide original email',
    from: 'From',
    to: 'To',
    subject: 'Subject',
    confirm: 'Do this',
    edit: 'Edit first',
    reject: 'Do not do this',
    saveEdit: 'Save edit',
    cancel: 'Cancel',
    editLabel: 'Edit suggested content',
    neverSend: 'Sending and commitments always wait for you.',
    handled: 'Automatically Handled',
    handledHeading: 'PAP cleared these for you',
    handledDescription: 'Results first. Undo or correct only when needed.',
    handledTrust: 'Nothing was sent as you.',
    actionTaken: 'Result',
    rule: 'Why',
    undoAvailable: 'Undo available',
    undoUnavailable: 'No undo',
    undo: 'Undo',
    wrong: 'Wrong',
    alwaysAsk: 'Ask next time',
    meeting: 'Meeting Coordination',
    meetingHeading: 'These times are ready to send',
    meetingDescription: 'PAP avoided conflicts, deep work, and time-zone surprises.',
    recommendedSlots: 'Available times',
    preparedReply: 'Ready reply',
    useSlot: 'Use first time',
    editReply: 'Edit reply',
    moreTimes: 'Show other times',
    boundaries: 'Automation Rules',
    boundariesDescription: 'One glance: automatic, ask first, or never.',
    googleConnection: 'Google Connection',
    googleConnectionHeading: 'Private alpha starts read-only',
    googleConnectionDescription: 'Next, PAP will connect Gmail and Google Calendar to generate briefings from real email and calendar data; sending email or changing calendars will still stop in the confirmation queue.',
    googleConnectionButton: 'Google connection coming soon',
    canDo: 'Automatic',
    mustAsk: 'Ask first',
    mustNever: 'Never',
    canDoText: 'When enabled, low-risk organization actions move into Automatically Handled.',
    mustAskText: 'These contacts or scenarios go to Pending Confirmation instead of silent execution.',
    mustNeverText: 'Matching keywords force confirmation.',
    canDoExample: 'Turn off marketing archive and marketing email returns to review.',
    mustAskExample: 'Maya + contract timing = always ask you.',
    mustNeverExample: 'Payments, contracts, and legal decisions are blocked.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    highRiskKeywords: 'High-risk keywords',
    addKeyword: 'Add keyword',
    newKeyword: 'New keyword',
    remove: 'Remove',
    workHours: 'Work hours',
    deepWork: 'Deep work',
    startHour: 'Start',
    endHour: 'End',
    activity: 'Just done',
    outcomeTitle: 'PAP just completed this and kept a record',
    outcomeSummary: '{count} actions completed this round · {count} records saved',
    outcomeConfirmed: 'Done: {title}. The pending list was updated and the record was saved.',
    outcomeRejected: 'Rejected: {title}. PAP will not do this step, and the record was saved.',
    outcomeDraftEdited: 'Draft saved: {title}. The edited version will be used when you confirm.',
    outcomeSettingsChanged: 'Rules updated: {title}. PAP will use this boundary next time.',
    outcomeSlotUsed: 'Meeting time selected: {title}. A traceable record was saved.',
    outcomeMoreOptions: 'More times requested: {title}. PAP will keep looking for better options.',
    meetingInlineDone: 'This meeting time was selected and saved to the local demo record.',
    meetingInlineMore: 'More times were requested, so PAP will keep looking for better options.',
    outcomeUndone: 'Undone: {title}. The automatic handling was rolled back and recorded.',
    outcomeWrong: 'Correction recorded: {title}. PAP will treat this as a boundary signal.',
    outcomeAlwaysAsk: 'Preference saved: {title}. Similar items will ask you first.',
    localRecordSaved: 'Saved to the local demo record.',
    confirmedTitle: 'Confirmed',
    rejectedTitle: 'Rejected',
    undoneTitle: 'Undone',
    wrongTitle: 'Marked wrong',
    alwaysAskTitle: 'Always ask next time',
    slotUsedTitle: 'Meeting slot selected',
    moreOptionsTitle: 'More times requested',
    confirmedPrefix: 'Confirmed: ',
    rejectedPrefix: 'Rejected: ',
    undonePrefix: 'Undone: ',
    wrongPrefix: 'Marked wrong: ',
    alwaysAskPrefix: 'Always ask: ',
    slotUsedPrefix: 'Selected: ',
    moreOptionsPrefix: 'More options requested: ',
  },
} satisfies Record<Locale, Record<string, string>>;

const localizedActionDetails: Record<Locale, Record<string, LocalizedAction>> = {
  zh: {
    action_email_1: {
      title: '归档低价值营销邮件',
      summary: '远程团队限时优惠',
      rationale: '该邮件匹配了已允许的营销邮件归档规则。',
      sourceSummary: 'SaaS 优惠邮件包含促销和退订信号。',
      recommendation: '自动归档，保留审计记录。',
      riskNote: '低风险：组织类动作，可以撤销。',
      sourceSubject: 'Limited offer for remote teams',
      ruleAction: '以后类似营销邮件继续自动归档',
      chips: ['低风险', '营销', '可撤销'],
    },
    action_email_2: {
      title: '回复 Maya：先不承诺周五交付',
      summary: '提案时间与合同审核',
      rationale: '出现 contract，且 Maya 是重要联系人。',
      sourceSummary: 'Maya 问合同能否周五前准备好。',
      recommendation: '发送一版谨慎回复：先确认范围，不承诺日期。',
      riskNote: '合同 + 交付时间 = 必须确认。',
      sourceSubject: 'Proposal timing and contract review',
      ruleAction: '合同永远先问我',
      preparedReply: 'Hi Maya，我先确认一下合同范围和内部审核时间，再回复你是否能在周五前准备好。为了避免误承诺，我今天晚些时候给你一个更准确的时间。',
      chips: ['高风险', '客户', '合同'],
    },
    action_email_3: {
      title: '给 Alex 发 3 个可选会议时间',
      summary: '下周会议',
      rationale: '邮件需要会议协调。',
      sourceSummary: 'Alex 想下周二下午聊产品 demo。',
      recommendation: '发送 3 个避开冲突的时间。',
      riskNote: '会影响日历，所以发送前确认。',
      sourceSubject: 'Meeting next week',
      ruleAction: 'Alex 的普通会议可自动建议',
      preparedReply: 'Hi Alex，下周二我这边可以给你几个时间：柏林时间 15:00、周三 16:00 或周四 14:30。你那边哪个更方便？',
      chips: ['中风险', '会议', '时区'],
    },
    action_email_4: {
      title: '总结订阅资讯',
      summary: '每周 AI 工具摘要',
      rationale: '订阅资讯匹配了已允许的总结规则。',
      sourceSummary: '行业资讯邮件被压缩为摘要，而不是占用收件箱。',
      recommendation: '生成摘要并保留原邮件链接。',
      riskNote: '低风险：没有代表你发送任何内容。',
      sourceSubject: 'Weekly AI tools digest',
      ruleAction: '类似资讯继续自动总结',
      chips: ['低风险', '资讯', '摘要'],
    },
  },
  en: {
    action_email_1: {
      title: 'Archive low-value marketing email',
      summary: 'Limited offer for remote teams',
      rationale: 'Marketing email matched an allowed automation rule.',
      sourceSummary: 'A SaaS promotion included offer and unsubscribe signals.',
      recommendation: 'Archive it automatically and keep an audit record.',
      riskNote: 'Low risk: organization action with undo available.',
      sourceSubject: 'Limited offer for remote teams',
      ruleAction: 'Keep archiving similar marketing emails',
      chips: ['Low risk', 'Marketing', 'Undoable'],
    },
    action_email_2: {
      title: 'Reply to Maya without promising Friday',
      summary: 'Proposal timing and contract review',
      rationale: 'Contract appears, and Maya is an important contact.',
      sourceSummary: 'Maya asks whether the contract can be ready by Friday.',
      recommendation: 'Send a cautious reply: confirm scope first, do not promise the date.',
      riskNote: 'Contract + delivery timing = confirmation required.',
      sourceSubject: 'Proposal timing and contract review',
      ruleAction: 'Always ask for contracts',
      preparedReply: 'Hi Maya, let me confirm the contract scope and internal review timing first. I do not want to overcommit on Friday before checking the details, so I will get back to you later today with a more accurate timeline.',
      chips: ['High risk', 'Client', 'Contract'],
    },
    action_email_3: {
      title: 'Send Alex 3 meeting options',
      summary: 'Meeting next week',
      rationale: 'This email needs scheduling support.',
      sourceSummary: 'Alex wants to discuss the product demo next Tuesday.',
      recommendation: 'Send 3 conflict-free times.',
      riskNote: 'This affects calendar availability, so confirm before sending.',
      sourceSubject: 'Meeting next week',
      ruleAction: 'Suggest normal meetings for Alex automatically',
      preparedReply: 'Hi Alex, I can offer a few options next week: Tuesday 15:00 Berlin, Wednesday 16:00 Berlin, or Thursday 14:30 Berlin. Which one works best on your side?',
      chips: ['Medium risk', 'Meeting', 'Time zone'],
    },
    action_email_4: {
      title: 'Summarize newsletter',
      summary: 'Weekly AI tools digest',
      rationale: 'Newsletter matched an allowed summarization rule.',
      sourceSummary: 'An industry update was compressed into a summary instead of staying in the inbox.',
      recommendation: 'Summarize and keep the source available.',
      riskNote: 'Low risk: nothing was sent as you.',
      sourceSubject: 'Weekly AI tools digest',
      ruleAction: 'Keep summarizing similar newsletters',
      chips: ['Low risk', 'Newsletter', 'Summary'],
    },
  },
};

const localizedPriorityText: Record<Locale, Record<string, string>> = {
  zh: {
    'Review important email from Maya Chen': '审核 Maya Chen 的重要邮件',
    'Suggest meeting times for Alex Rivera': '为 Alex Rivera 推荐会议时间',
    'Coordinate meeting: Meeting next week': '协调会议：下周会议',
    'PAP automatically handled 2 low-value item.': 'PAP 已自动处理 2 个低价值事项。',
  },
  en: {},
};

export default function Dashboard() {
  const [locale, setLocale] = useState<Locale>('zh');
  const [persistedState, setPersistedState] = useState<PersistedDashboardStateV1>(defaultDashboardState);
  const [hydrated, setHydrated] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const briefing = useMemo(() => runPapV1Pipeline(persistedState.preferences), [persistedState.preferences]);
  const t = copy[locale];
  const results = persistedState.actionResults;
  const editedDrafts = persistedState.editedDrafts;

  useEffect(() => {
    setPersistedState(readPersistedDashboardState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(persistedState));
  }, [hydrated, persistedState]);

  const emailsById = useMemo(
    () => new Map(sampleEmails.map((email) => [email.id, email])),
    [],
  );
  const pendingActions = briefing.pendingConfirmations.filter(
    (action) => !results.some((result) => result.id === action.id),
  );
  const automaticActions = briefing.automaticallyHandled.filter(
    (action) => !results.some((result) => result.id === action.id && result.status === 'undone'),
  );
  const meetingSuggestions = briefing.meetingSuggestions.filter(
    (suggestion) => !results.some((result) => result.id === `${suggestion.emailId}_slot`),
  );

  function appendAuditEvent(actionId: string, title: string, eventType: AuditEventType) {
    setPersistedState((current) => ({
      ...current,
      auditEvents: [
        ...current.auditEvents,
        {
          id: `${Date.now()}_${eventType}_${actionId}`,
          actionId,
          actionTitle: title,
          eventType,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function recordResult(title: string, status: ActionStatus, id = `${status}_${title}`) {
    setPersistedState((current) => ({
      ...current,
      actionResults: [
        ...current.actionResults.filter((result) => result.id !== id),
        { id, title, status },
      ],
      auditEvents: [
        ...current.auditEvents,
        {
          id: `${Date.now()}_${status}_${id}`,
          actionId: id,
          actionTitle: title,
          eventType: status,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function recordActionResult(action: SuggestedAction, status: ActionStatus) {
    recordResult(localizedAction(action, locale).title, status, action.id);
  }

  function updatePreferences(change: BoundaryChange) {
    setPersistedState((current) => ({
      ...current,
      preferences: change.update(current.preferences),
      auditEvents: [
        ...current.auditEvents,
        {
          id: `${Date.now()}_settingsChanged_${change.title}`,
          actionId: 'settings',
          actionTitle: change.title,
          eventType: 'settingsChanged',
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function startEdit(action: SuggestedAction) {
    setEditingActionId(action.id);
    const localized = localizedAction(action, locale);
    setDraft(editedDrafts[action.id] ?? localized.preparedReply ?? localized.summary);
  }

  function resetDemo() {
    window.localStorage.removeItem(storageKey);
    setPersistedState(defaultDashboardState);
    setEditingActionId(null);
    setDraft('');
  }

  function saveEdit(action: SuggestedAction) {
    const title = localizedAction(action, locale).title;
    setPersistedState((current) => ({
      ...current,
      editedDrafts: { ...current.editedDrafts, [action.id]: draft },
      auditEvents: [
        ...current.auditEvents,
        {
          id: `${Date.now()}_draftEdited_${action.id}`,
          actionId: action.id,
          actionTitle: title,
          eventType: 'draftEdited',
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setEditingActionId(null);
    setDraft('');
  }

  return (
    <AppShell locale={locale} onLocaleChange={setLocale} onResetDemo={resetDemo}>
      <OutcomeFeedbackBar locale={locale} events={persistedState.auditEvents} />

      <section id="pending" className="space-y-6 rounded-[2rem] border border-emerald-300/20 bg-[#0b1b17] p-4 shadow-2xl shadow-black/25 md:p-6">
        <PageHeader eyebrow={t.pending} title={t.pendingHeading} description={t.pendingDescription} />
        <div className="grid gap-3 rounded-3xl border border-emerald-300/15 bg-stone-950/50 p-4 text-sm text-stone-300 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-2xl font-semibold text-emerald-100">
              {pendingActions.length > 0 ? interpolate(t.pendingQueueSummary, pendingActions.length) : t.pendingQueueCleared}
            </p>
            <p className="mt-1 text-stone-400">
              {pendingActions.length > 0 ? t.pendingQueueTrust : t.pendingQueueClearedTrust}
            </p>
          </div>
          <p className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950">{t.neverSend}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {pendingActions.length === 0 ? (
            <p className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 text-sm font-medium text-emerald-100 shadow-lg shadow-black/20 lg:col-span-2">
              {t.todayClearedNote}
            </p>
          ) : pendingActions.map((action) => (
            <PendingConfirmationCard
              key={action.id}
              action={action}
              email={emailsById.get(action.emailId)}
              locale={locale}
              editedDraft={editedDrafts[action.id]}
              editing={editingActionId === action.id}
              draft={draft}
              onDraftChange={setDraft}
              onConfirm={() => recordActionResult(action, 'confirmed')}
              onReject={() => recordActionResult(action, 'rejected')}
              onEdit={() => startEdit(action)}
              onSave={() => saveEdit(action)}
              onCancel={() => setEditingActionId(null)}
              onRuleAction={() => recordResult(localizedAction(action, locale).ruleAction, 'alwaysAsk', `${action.id}_rule`)}
            />
          ))}
        </div>
      </section>

      <section id="today" className="space-y-6">
        <PageHeader
          eyebrow={t.todayBriefing}
          title={pendingActions.length > 0 ? interpolate(t.todayHeading, pendingActions.length) : t.todayClearedHeading}
          description={pendingActions.length > 0 ? t.todaySubheading : t.todayClearedNote}
        />
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionPanel title={t.pendingPreview} description={t.neverSend} priority>
            <div className="space-y-4">
              <p className="text-5xl font-semibold text-emerald-200">{pendingActions.length}</p>
              {pendingActions.length > 0 ? (
                <>
                  <ol className="space-y-3">
                    {pendingActions.slice(0, 2).map((action, index) => (
                      <li key={action.id} className="flex gap-3 rounded-2xl bg-stone-950/60 p-4 text-stone-100 ring-1 ring-white/5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-semibold text-emerald-950">
                          {index + 1}
                        </span>
                        <span>{localizedAction(action, locale).title}</span>
                      </li>
                    ))}
                  </ol>
                  <a className="inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-950" href="#pending">
                    {t.previewCta}
                  </a>
                </>
              ) : (
                <p className="rounded-2xl bg-stone-950/60 p-4 text-sm font-medium text-emerald-100 ring-1 ring-white/5">
                  {t.todayClearedNote}
                </p>
              )}
            </div>
          </SectionPanel>
          <div className="space-y-4">
            <MetricGrid
              metrics={[
                { label: t.pendingMetric, value: pendingActions.length },
                { label: t.handledMetric, value: automaticActions.length },
                { label: t.meetingMetric, value: meetingSuggestions.length },
                { label: t.importantMetric, value: briefing.importantEmails.length },
              ]}
            />
            <SectionPanel title={t.topPriorities} description={interpolate(t.autoSummary, briefing.lowValueHandledCount)}>
              <BriefingPriorityList priorities={briefing.topPriorities.slice(0, 3)} locale={locale} />
            </SectionPanel>
          </div>
        </div>
      </section>

      <section id="meetings" className="space-y-6">
        <PageHeader eyebrow={t.meeting} title={t.meetingHeading} description={t.meetingDescription} />
        <div className="grid gap-4 lg:grid-cols-2">
          {meetingSuggestions.length === 0 ? (
            <p className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 text-sm font-medium text-emerald-100 shadow-lg shadow-black/20">
              {t.meetingsDone}
            </p>
          ) : meetingSuggestions.map((suggestion) => (
            <MeetingSuggestionCard
              key={suggestion.emailId}
              suggestion={suggestion}
              email={emailsById.get(suggestion.emailId)}
              locale={locale}
              result={results.find((result) => result.id === `${suggestion.emailId}_more`)}
              onUseSlot={(title) => recordResult(title, 'slotUsed', `${suggestion.emailId}_slot`)}
              onMoreTimes={(title) => recordResult(title, 'moreOptions', `${suggestion.emailId}_more`)}
            />
          ))}
        </div>
      </section>

      <ConnectionReadinessPanel locale={locale} />

      <section id="automated" className="space-y-6">
        <PageHeader eyebrow={t.handled} title={t.handledHeading} description={t.handledDescription} />
        <p className="rounded-2xl border border-emerald-300/10 bg-stone-950/50 px-4 py-3 text-sm text-emerald-100">
          {t.handledTrust}
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {automaticActions.map((action) => (
            <AutomationLogCard
              key={action.id}
              action={action}
              locale={locale}
              onUndo={() => recordActionResult(action, 'undone')}
              onWrong={() => recordActionResult(action, 'wrong')}
              onAlwaysAsk={() => recordResult(localizedAction(action, locale).ruleAction, 'alwaysAsk', `${action.id}_alwaysAsk`)}
            />
          ))}
        </div>
      </section>

      <ActivityPanels locale={locale} events={persistedState.auditEvents} />

      <section id="boundaries" className="space-y-6">
        <PageHeader eyebrow={t.boundaries} title={t.boundaries} description={t.boundariesDescription} />
        <AutomationBoundarySection
          locale={locale}
          preferences={persistedState.preferences}
          onChange={updatePreferences}
        />
      </section>
    </AppShell>
  );
}

function AppShell(props: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onResetDemo: () => void;
  children: ReactNode;
}) {
  const t = copy[props.locale];
  const navItems = [
    { href: '#today', label: t.navToday },
    { href: '#pending', label: t.navPending },
    { href: '#meetings', label: t.navMeetings },
    { href: '#automated', label: t.navAutomated },
    { href: '#boundaries', label: t.navBoundaries },
  ];

  return (
    <main className="min-h-screen bg-[#07110f] text-stone-100">
      <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-4 lg:grid-cols-[17rem_1fr] lg:px-6 lg:py-6">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex h-full flex-col rounded-[2rem] border border-emerald-300/15 bg-[#0d1714]/95 p-5 shadow-2xl shadow-black/25">
            <p className="text-sm font-medium uppercase tracking-[0.35em] text-emerald-200">PAP V1</p>
            <h1 className="mt-4 text-2xl font-semibold leading-tight text-stone-50">{t.oneLiner}</h1>
            <nav className="mt-8 grid gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-stone-300 transition hover:bg-emerald-300 hover:text-emerald-950"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto space-y-4 pt-6">
              <button
                className="w-full rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-amber-950"
                onClick={props.onResetDemo}
              >
                {t.resetDemo}
              </button>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-stone-500">{t.language}</p>
                <div className="flex rounded-full border border-emerald-300/20 bg-black/25 p-1 text-sm">
                  <button
                    className={`flex-1 rounded-full px-3 py-2 ${props.locale === 'zh' ? 'bg-emerald-300 text-emerald-950' : 'text-emerald-100'}`}
                    onClick={() => props.onLocaleChange('zh')}
                  >
                    中文
                  </button>
                  <button
                    className={`flex-1 rounded-full px-3 py-2 ${props.locale === 'en' ? 'bg-emerald-300 text-emerald-950' : 'text-emerald-100'}`}
                    onClick={() => props.onLocaleChange('en')}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div className="space-y-8">
          <SyncStatus locale={props.locale} />
          {props.children}
        </div>
      </div>
    </main>
  );
}

function SyncStatus(props: { locale: Locale }) {
  const t = copy[props.locale];
  const integrationLabels = integrationStatusLabels(demoIntegrationStatus, props.locale);

  return (
    <header className="rounded-[2rem] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,#155e4f,transparent_34%),linear-gradient(135deg,#10211d,#050807)] p-5 shadow-2xl shadow-black/25">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-200">{t.demoWorkspace}</p>
        <p className="mt-3 text-2xl font-semibold text-stone-50">{t.processed}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">{t.statusDetail}</p>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {integrationLabels.map((label) => (
          <p key={label} className="rounded-full border border-emerald-300/20 bg-emerald-950/35 px-4 py-2 text-sm font-semibold text-emerald-100">
            {label}
          </p>
        ))}
      </div>
    </header>
  );
}

function PageHeader(props: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-300">{props.eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50 md:text-4xl">{props.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400 md:text-base">{props.description}</p>
    </div>
  );
}

function MetricGrid(props: { metrics: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {props.metrics.map((metric) => (
        <div key={metric.label} className="rounded-3xl border border-emerald-300/10 bg-[#0d1714] p-5 shadow-lg shadow-black/20">
          <p className="text-sm text-stone-400">{metric.label}</p>
          <p className="mt-2 text-4xl font-semibold text-emerald-200">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

function SectionPanel(props: { title: string; description: string; children: ReactNode; priority?: boolean }) {
  return (
    <section className={`rounded-3xl border p-5 shadow-xl shadow-black/20 md:p-6 ${props.priority ? 'border-emerald-300/25 bg-[#10231e]' : 'border-emerald-300/10 bg-[#0d1714]/90'}`}>
      <div className="mb-5">
        <h3 className={props.priority ? 'text-3xl font-semibold text-stone-50' : 'text-2xl font-semibold text-stone-50'}>{props.title}</h3>
        {props.description && <p className="mt-1 text-sm text-stone-400">{props.description}</p>}
      </div>
      {props.children}
    </section>
  );
}

function BriefingPriorityList(props: { priorities: string[]; locale: Locale }) {
  return (
    <ol className="space-y-3">
      {props.priorities.map((priority, index) => (
        <li key={priority} className="flex gap-3 rounded-2xl bg-stone-950/60 p-4 text-stone-100 ring-1 ring-white/5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-sm font-semibold text-emerald-950">
            {index + 1}
          </span>
          <span>{props.locale === 'zh' ? localizedPriorityText.zh[priority] ?? priority : priority}</span>
        </li>
      ))}
    </ol>
  );
}

function PendingConfirmationCard(props: {
  action: SuggestedAction;
  email?: EmailMessage;
  locale: Locale;
  editedDraft?: string;
  editing?: boolean;
  draft?: string;
  onDraftChange?: (value: string) => void;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRuleAction: () => void;
}) {
  const t = copy[props.locale];
  const action = localizedAction(props.action, props.locale);
  const preparedDraft = props.editedDraft ?? action.preparedReply;

  return (
    <article className="rounded-3xl border border-amber-300/20 bg-stone-950/75 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap gap-2">
        {action.chips.map((chip) => (
          <Chip key={chip}>{chip}</Chip>
        ))}
      </div>
      <h3 className="mt-4 text-2xl font-semibold leading-tight text-stone-50">{action.title}</h3>
      <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-950/25 p-4 ring-1 ring-white/5">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">{t.confirmOutcome}</p>
        <p className="mt-1 text-sm text-stone-400">{t.preparedDraft}</p>
        {props.editing ? (
          <div className="mt-3 space-y-3">
            <label className="sr-only" htmlFor={`edit-${props.action.id}`}>{t.editLabel}</label>
            <textarea
              id={`edit-${props.action.id}`}
              aria-label={t.editLabel}
              className="min-h-28 w-full rounded-2xl border border-emerald-300/20 bg-stone-950/70 p-3 text-sm text-stone-100 outline-none focus:border-emerald-300"
              value={props.draft ?? ''}
              onChange={(event) => props.onDraftChange?.(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950" onClick={props.onSave}>{t.saveEdit}</button>
              <button className="rounded-full bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-200" onClick={props.onCancel}>{t.cancel}</button>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-stone-100">{preparedDraft ?? t.noDraftNeeded}</p>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-950" onClick={props.onConfirm}>{t.confirm}</button>
        <button className="rounded-full bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200" onClick={props.onEdit}>{t.edit}</button>
        <button className="rounded-full bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200" onClick={props.onReject}>{t.reject}</button>
      </div>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-2xl bg-[#07110f] p-4 ring-1 ring-white/5">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.papSuggestion}</p>
          <p className="mt-2 leading-6 text-stone-200">{action.recommendation}</p>
        </div>
        <div className="rounded-2xl bg-[#07110f] p-4 ring-1 ring-white/5">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.originalSummary}</p>
          <p className="mt-2 leading-6 text-stone-200">{action.sourceSummary}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-[#07110f] p-4 text-sm ring-1 ring-white/5 md:grid-cols-2">
        <DetailLine label={t.confirmationReason}>{action.rationale}</DetailLine>
        <DetailLine label={t.riskNote}>{action.riskNote}</DetailLine>
      </div>
      {props.email && <OriginalEmail email={props.email} locale={props.locale} />}
      <p className="mt-4 text-sm font-medium text-amber-200">{t.neverSend}</p>
      <div className="mt-3">
        <button className="rounded-full border border-emerald-300/30 px-4 py-2.5 text-sm font-semibold text-emerald-100" onClick={props.onRuleAction}>{action.ruleAction}</button>
      </div>
    </article>
  );
}

function AutomationLogCard(props: {
  action: SuggestedAction;
  locale: Locale;
  onUndo: () => void;
  onWrong: () => void;
  onAlwaysAsk: () => void;
}) {
  const t = copy[props.locale];
  const action = localizedAction(props.action, props.locale);

  return (
    <article className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.actionTaken}</p>
          <h3 className="mt-2 text-xl font-semibold text-stone-50">{action.title}</h3>
          <p className="mt-2 text-sm leading-6 text-stone-300">{action.recommendation}</p>
        </div>
        <Chip>{props.action.canUndo ? t.undoAvailable : t.undoUnavailable}</Chip>
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-[#07110f] p-4 text-sm ring-1 ring-white/5 md:grid-cols-2">
        <DetailLine label={t.rule}>{action.rationale}</DetailLine>
        <DetailLine label={t.source}>{action.sourceSubject}</DetailLine>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {props.action.canUndo && (
          <button className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950" onClick={props.onUndo}>{t.undo}</button>
        )}
        <button className="rounded-full bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-200" onClick={props.onWrong}>{t.wrong}</button>
        <button className="rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100" onClick={props.onAlwaysAsk}>{t.alwaysAsk}</button>
      </div>
    </article>
  );
}

function MeetingSuggestionCard(props: {
  suggestion: MeetingSuggestion;
  email?: EmailMessage;
  locale: Locale;
  result?: ActionResult;
  onUseSlot: (title: string) => void;
  onMoreTimes: (title: string) => void;
}) {
  const t = copy[props.locale];
  const meeting = localizedMeeting(props.suggestion, props.locale);
  const firstSlot = props.suggestion.proposedSlots[0];

  return (
    <article className="rounded-3xl border border-cyan-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap gap-2">
        <Chip>{meeting.userTimeZone}</Chip>
        <Chip>{meeting.participantTimeZone}</Chip>
      </div>
      <h3 className="mt-4 text-2xl font-semibold leading-tight text-stone-50">{meeting.title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-300">{meeting.requestSummary}</p>
      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.recommendedSlots}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {props.suggestion.proposedSlots.map((slot, index) => (
            <div key={slot.startsAt} className="rounded-2xl bg-emerald-950/35 p-4 text-sm text-stone-300 ring-1 ring-white/5">
              <p className="text-lg font-semibold text-emerald-200">
                {formatTimeInZone(slot.startsAt, props.locale, meeting.participantTimeZone)}
              </p>
              <p className="mt-1 text-stone-400">
                {formatTimeInZone(slot.startsAt, props.locale, meeting.userTimeZone)} · {index + 1}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-[#07110f] p-4 ring-1 ring-white/5">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.preparedReply}</p>
        <p className="mt-2 text-base leading-7 text-stone-200">{meeting.draftReply}</p>
      </div>
      {props.email && <OriginalEmail email={props.email} locale={props.locale} />}
      {props.result && (
        <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-950/30 p-4 text-sm font-medium text-emerald-100">
          {props.result.status === 'slotUsed' ? t.meetingInlineDone : t.meetingInlineMore}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950" onClick={() => props.onUseSlot(firstSlot ? `${meeting.title} · ${formatTimeInZone(firstSlot.startsAt, props.locale, meeting.participantTimeZone)}` : meeting.title)}>{t.useSlot}</button>
        <button className="rounded-full bg-stone-800 px-4 py-2 text-sm font-semibold text-stone-200">{t.editReply}</button>
        <button className="rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100" onClick={() => props.onMoreTimes(meeting.title)}>{t.moreTimes}</button>
      </div>
    </article>
  );
}

function OriginalEmail(props: { email: EmailMessage; locale: Locale }) {
  const t = copy[props.locale];

  return (
    <details className="mt-4 rounded-2xl border border-emerald-300/10 bg-[#07110f] p-4 text-sm ring-1 ring-white/5">
      <summary className="cursor-pointer font-semibold text-emerald-200 marker:text-emerald-300">
        {t.showOriginal}
      </summary>
      <div className="mt-4 space-y-3 text-stone-300">
        <div className="grid gap-3 md:grid-cols-2">
          <DetailLine label={t.from}>{props.email.from}</DetailLine>
          <DetailLine label={t.to}>{props.email.to.join(', ')}</DetailLine>
        </div>
        <DetailLine label={t.subject}>{props.email.subject}</DetailLine>
        <div className="rounded-2xl bg-stone-950/70 p-4 leading-7 text-stone-200">
          {props.email.body}
        </div>
      </div>
    </details>
  );
}

function AutomationBoundarySection(props: {
  locale: Locale;
  preferences: UserPreferences;
  onChange: (change: BoundaryChange) => void;
}) {
  const t = copy[props.locale];
  const [keyword, setKeyword] = useState('');
  const permissionLabels: Array<{ permission: AutomationPermission; label: string }> = [
    { permission: 'archive_marketing', label: props.locale === 'zh' ? '自动归档营销邮件' : 'Archive marketing' },
    { permission: 'summarize_newsletters', label: props.locale === 'zh' ? '自动总结资讯邮件' : 'Summarize newsletters' },
    { permission: 'send_simple_acknowledgement', label: props.locale === 'zh' ? '发送简单确认' : 'Send simple acknowledgements' },
    { permission: 'accept_whitelisted_low_risk_meetings', label: props.locale === 'zh' ? '接受白名单低风险会议' : 'Accept whitelisted low-risk meetings' },
  ];

  function togglePermission(permission: AutomationPermission, label: string) {
    props.onChange({
      title: label,
      update: (preferences) => {
        const enabled = preferences.automationPermissions.includes(permission);
        return {
          ...preferences,
          automationPermissions: enabled
            ? preferences.automationPermissions.filter((candidate) => candidate !== permission)
            : [...preferences.automationPermissions, permission],
        };
      },
    });
  }

  function toggleContact(email: string, name: string) {
    props.onChange({
      title: props.locale === 'zh' ? `${name} 是否先问我` : `${name} ask first`,
      update: (preferences) => ({
        ...preferences,
        contacts: preferences.contacts.map((contact) => (
          contact.email === email ? { ...contact, alwaysConfirm: !contact.alwaysConfirm } : contact
        )),
      }),
    });
  }

  function addKeyword() {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized || props.preferences.highRiskKeywords.includes(normalized)) return;
    props.onChange({
      title: props.locale === 'zh' ? `添加高风险关键词：${normalized}` : `Add high-risk keyword: ${normalized}`,
      update: (preferences) => ({
        ...preferences,
        highRiskKeywords: [...preferences.highRiskKeywords, normalized],
      }),
    });
    setKeyword('');
  }

  function removeKeyword(value: string) {
    props.onChange({
      title: props.locale === 'zh' ? `移除高风险关键词：${value}` : `Remove high-risk keyword: ${value}`,
      update: (preferences) => ({
        ...preferences,
        highRiskKeywords: preferences.highRiskKeywords.filter((candidate) => candidate !== value),
      }),
    });
  }

  function updateWorkHours(field: 'startHour' | 'endHour', value: number) {
    const next = clampHour(value);
    props.onChange({
      title: props.locale === 'zh' ? '更新工作时间' : 'Update work hours',
      update: (preferences) => {
        const workHours = { ...preferences.workHours, [field]: next };
        if (workHours.startHour >= workHours.endHour) return preferences;
        return { ...preferences, workHours };
      },
    });
  }

  function updateDeepWork(field: 'startHour' | 'endHour', value: number) {
    const next = clampHour(value);
    props.onChange({
      title: props.locale === 'zh' ? '更新深度工作时间' : 'Update deep work hours',
      update: (preferences) => {
        const current = preferences.deepWorkHours[0] ?? { startHour: 9, endHour: 11 };
        const deepWork = { ...current, [field]: next };
        if (deepWork.startHour >= deepWork.endHour) return preferences;
        return { ...preferences, deepWorkHours: [deepWork] };
      },
    });
  }

  const deepWork = props.preferences.deepWorkHours[0] ?? { startHour: 9, endHour: 11 };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <article className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
        <h3 className="text-lg font-semibold text-stone-50">{t.boundaryAutoTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">{t.canDoText}</p>
        <div className="mt-5 space-y-3">
          {permissionLabels.map((item) => {
            const enabled = props.preferences.automationPermissions.includes(item.permission);
            return (
              <button
                key={item.permission}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ring-1 ring-white/5 ${enabled ? 'bg-emerald-300 text-emerald-950' : 'bg-[#07110f] text-stone-200'}`}
                onClick={() => togglePermission(item.permission, item.label)}
              >
                <span>{item.label}</span>
                <span className="font-semibold">{enabled ? t.enabled : t.disabled}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-5 rounded-2xl bg-[#07110f] p-4 text-sm text-emerald-100 ring-1 ring-white/5">{t.canDoExample}</p>
      </article>

      <article className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
        <h3 className="text-lg font-semibold text-stone-50">{t.boundaryAskTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">{t.mustAskText}</p>
        <div className="mt-5 space-y-3">
          {props.preferences.contacts.map((contact) => (
            <button
              key={contact.email}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ring-1 ring-white/5 ${contact.alwaysConfirm ? 'bg-amber-300 text-amber-950' : 'bg-[#07110f] text-stone-200'}`}
              onClick={() => toggleContact(contact.email, contact.name)}
            >
              <span>{contact.name}</span>
              <span className="font-semibold">{contact.alwaysConfirm ? t.enabled : t.disabled}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#07110f] p-4 text-sm text-stone-300 ring-1 ring-white/5">
          <label>
            <span className="block text-xs uppercase tracking-[0.16em] text-stone-500">{t.startHour}</span>
            <input className="mt-2 w-full rounded-xl bg-stone-950 p-2 text-stone-100" type="number" min="0" max="23" value={props.preferences.workHours.startHour} onChange={(event) => updateWorkHours('startHour', Number(event.target.value))} />
          </label>
          <label>
            <span className="block text-xs uppercase tracking-[0.16em] text-stone-500">{t.endHour}</span>
            <input className="mt-2 w-full rounded-xl bg-stone-950 p-2 text-stone-100" type="number" min="0" max="23" value={props.preferences.workHours.endHour} onChange={(event) => updateWorkHours('endHour', Number(event.target.value))} />
          </label>
          <p className="col-span-2 text-emerald-100">{t.workHours}</p>
          <label>
            <span className="block text-xs uppercase tracking-[0.16em] text-stone-500">{t.startHour}</span>
            <input className="mt-2 w-full rounded-xl bg-stone-950 p-2 text-stone-100" type="number" min="0" max="23" value={deepWork.startHour} onChange={(event) => updateDeepWork('startHour', Number(event.target.value))} />
          </label>
          <label>
            <span className="block text-xs uppercase tracking-[0.16em] text-stone-500">{t.endHour}</span>
            <input className="mt-2 w-full rounded-xl bg-stone-950 p-2 text-stone-100" type="number" min="0" max="23" value={deepWork.endHour} onChange={(event) => updateDeepWork('endHour', Number(event.target.value))} />
          </label>
          <p className="col-span-2 text-emerald-100">{t.deepWork}</p>
        </div>
      </article>

      <article className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
        <h3 className="text-lg font-semibold text-stone-50">{t.boundaryNeverTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-stone-300">{t.mustNeverText}</p>
        <div className="mt-5 flex gap-2">
          <input
            aria-label={t.newKeyword}
            className="min-w-0 flex-1 rounded-full bg-[#07110f] px-4 py-2 text-sm text-stone-100 ring-1 ring-white/5"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addKeyword();
            }}
            placeholder={t.newKeyword}
          />
          <button className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950" onClick={addKeyword}>{t.addKeyword}</button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {props.preferences.highRiskKeywords.map((value) => (
            <button
              key={value}
              className="rounded-full bg-rose-950 px-3 py-2 text-sm text-rose-100 ring-1 ring-rose-300/20"
              onClick={() => removeKeyword(value)}
              aria-label={`${t.remove} ${value}`}
            >
              {value} ×
            </button>
          ))}
        </div>
        <p className="mt-5 rounded-2xl bg-[#07110f] p-4 text-sm text-emerald-100 ring-1 ring-white/5">{t.mustNeverExample}</p>
      </article>
    </div>
  );
}

function ConnectionReadinessPanel(props: { locale: Locale }) {
  const t = copy[props.locale];
  const integrationLabels = integrationStatusLabels(demoIntegrationStatus, props.locale);

  return (
    <section className="space-y-4">
      <PageHeader eyebrow={t.googleConnection} title={t.googleConnectionHeading} description={t.googleConnectionDescription} />
      <div className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
        <div className="flex flex-wrap gap-2">
          {integrationLabels.map((label) => (
            <Chip key={label}>{label}</Chip>
          ))}
        </div>
        <button className="mt-5 cursor-not-allowed rounded-full border border-emerald-300/30 px-4 py-2.5 text-sm font-semibold text-emerald-100" disabled>
          {t.googleConnectionButton}
        </button>
      </div>
    </section>
  );
}

function OutcomeFeedbackBar(props: { locale: Locale; events: AuditEvent[] }) {
  const t = copy[props.locale];
  const latestEvent = latestAuditEvent(props.events);

  if (!latestEvent) return null;

  return (
    <section className="rounded-[2rem] border border-emerald-300/20 bg-[linear-gradient(135deg,#12352d,#07110f)] p-5 shadow-2xl shadow-black/25 md:flex md:items-center md:justify-between md:gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-200">{t.outcomeTitle}</p>
        <p className="mt-3 text-lg font-semibold leading-7 text-stone-50">{outcomeMessage(latestEvent, props.locale)}</p>
      </div>
      <p className="mt-4 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950 md:mt-0">
        {interpolate(t.outcomeSummary, props.events.length)}
      </p>
    </section>
  );
}

function ActivityPanels(props: { locale: Locale; events: AuditEvent[] }) {
  const t = copy[props.locale];
  const panels: Array<{ status: AuditEventType; title: string; prefix: string }> = [
    { status: 'confirmed', title: t.confirmedTitle, prefix: t.confirmedPrefix },
    { status: 'rejected', title: t.rejectedTitle, prefix: t.rejectedPrefix },
    { status: 'undone', title: t.undoneTitle, prefix: t.undonePrefix },
    { status: 'wrong', title: t.wrongTitle, prefix: t.wrongPrefix },
    { status: 'alwaysAsk', title: t.alwaysAskTitle, prefix: t.alwaysAskPrefix },
    { status: 'slotUsed', title: t.slotUsedTitle, prefix: t.slotUsedPrefix },
    { status: 'moreOptions', title: t.moreOptionsTitle, prefix: t.moreOptionsPrefix },
    { status: 'draftEdited', title: props.locale === 'zh' ? '草稿已保存' : 'Draft saved', prefix: props.locale === 'zh' ? '已保存：' : 'Saved: ' },
    { status: 'settingsChanged', title: props.locale === 'zh' ? '边界已更新' : 'Rules updated', prefix: props.locale === 'zh' ? '已更新：' : 'Updated: ' },
  ];
  const activePanels = panels
    .map((panel) => ({
      ...panel,
      events: props.events
        .filter((event) => event.eventType === panel.status)
        .toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
    }))
    .filter((panel) => panel.events.length > 0);

  if (activePanels.length === 0) return null;

  return (
    <section className="space-y-4" aria-label={t.activity}>
      <PageHeader eyebrow={t.activity} title={t.activity} description="" />
      <div className="grid gap-4 lg:grid-cols-2">
        {activePanels.map((panel) => (
          <SectionPanel key={panel.status} title={panel.title} description="">
            <ul className="space-y-2 text-sm text-stone-300">
              {panel.events.map((event) => (
                <li key={event.id} className="rounded-2xl bg-stone-950/60 p-4">
                  <p>{panel.prefix}{event.actionTitle}</p>
                  <p className="mt-1 text-xs text-stone-500">{t.localRecordSaved}</p>
                </li>
              ))}
            </ul>
          </SectionPanel>
        ))}
      </div>
    </section>
  );
}

function integrationStatusLabels(status: PapIntegrationStatus, locale: Locale) {
  const t = copy[locale];

  return [
    status.source === 'demo_data' ? t.dataSource : 'Google',
    status.gmail === 'not_connected' ? t.gmailNotConnected : 'Gmail',
    status.calendar === 'not_connected' ? t.calendarNotConnected : 'Calendar',
    status.storage === 'browser_local' ? t.browserOnly : 'Server storage',
    status.automationMode === 'confirmation_only' ? t.safeMode : 'Live actions',
  ];
}

function latestAuditEvent(events: AuditEvent[]) {
  return events.toSorted((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))[0];
}

function outcomeMessage(event: AuditEvent, locale: Locale) {
  const t = copy[locale];
  const templates: Record<AuditEventType, string> = {
    confirmed: t.outcomeConfirmed,
    rejected: t.outcomeRejected,
    undone: t.outcomeUndone,
    wrong: t.outcomeWrong,
    alwaysAsk: t.outcomeAlwaysAsk,
    slotUsed: t.outcomeSlotUsed,
    moreOptions: t.outcomeMoreOptions,
    draftEdited: t.outcomeDraftEdited,
    settingsChanged: t.outcomeSettingsChanged,
  };

  return interpolateTitle(templates[event.eventType], event.actionTitle);
}

function clampHour(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(23, value));
}

function readPersistedDashboardState(): PersistedDashboardStateV1 {
  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return defaultDashboardState;
    const parsed = JSON.parse(value) as Partial<PersistedDashboardStateV1>;
    if (parsed.version !== 1) return defaultDashboardState;

    return {
      version: 1,
      preferences: parsed.preferences ?? samplePreferences,
      actionResults: Array.isArray(parsed.actionResults) ? parsed.actionResults : [],
      auditEvents: Array.isArray(parsed.auditEvents) ? parsed.auditEvents : [],
      editedDrafts: parsed.editedDrafts ?? {},
    };
  } catch {
    return defaultDashboardState;
  }
}

function DetailLine(props: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{props.label}</p>
      <p className="mt-1 leading-6 text-stone-300">{props.children}</p>
    </div>
  );
}

function Chip(props: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-100 ring-1 ring-emerald-300/20">
      {props.children}
    </span>
  );
}

function localizedAction(action: SuggestedAction, locale: Locale): LocalizedAction {
  return localizedActionDetails[locale][action.id] ?? {
    title: action.title,
    summary: action.summary,
    rationale: action.rationale,
    sourceSummary: action.summary,
    recommendation: action.title,
    riskNote: action.rationale,
    sourceSubject: action.summary,
    ruleAction: copy[locale].alwaysAsk,
    chips: [action.riskLevel],
  };
}

function localizedMeeting(suggestion: MeetingSuggestion, locale: Locale): LocalizedMeeting {
  if (locale === 'zh') {
    return {
      title: '协调会议：下周会议',
      requestSummary: 'Alex 想在下周二讨论产品 demo。',
      participantLabel: 'Alex Rivera',
      userTimeZone: 'Europe/Berlin',
      participantTimeZone: 'America/New_York',
      draftReply: '下周二你那边 9:00 对我来说合适。这个时间方便吗？',
    };
  }

  return {
    title: suggestion.title,
    requestSummary: 'Alex wants to discuss the product demo next Tuesday.',
    participantLabel: 'Alex Rivera',
    userTimeZone: 'Europe/Berlin',
    participantTimeZone: 'America/New_York',
    draftReply: 'Tuesday 9:00 your time works well. Does that fit your side?',
  };
}

function interpolate(template: string, count: number) {
  return template.replaceAll('{count}', String(count));
}

function interpolateTitle(template: string, title: string) {
  return template.replace('{title}', title);
}

function formatTimeInZone(value: string, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}
