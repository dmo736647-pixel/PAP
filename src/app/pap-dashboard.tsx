'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { sampleEmails } from '@/lib/pap/fixtures';
import { runPapV1Pipeline } from '@/lib/pap/pipeline';
import type { EmailMessage, MeetingSuggestion, SuggestedAction } from '@/lib/pap/types';

type Locale = 'zh' | 'en';
type ActionStatus = 'confirmed' | 'rejected' | 'undone' | 'wrong' | 'alwaysAsk' | 'slotUsed' | 'moreOptions';
type ActionResult = {
  id: string;
  title: string;
  status: ActionStatus;
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
    synced: '12 分钟前已同步',
    processed: '42 封邮件，只有 4 件需要你看',
    language: '语言',
    todayBriefing: '今日简报',
    todayHeading: '今天有 {count} 件事需要你决定',
    todaySubheading: 'PAP 已清掉低价值事项，把真正需要判断的动作放在前面。',
    pendingMetric: '等你决定',
    handledMetric: '已替你清理',
    meetingMetric: '可安排会议',
    importantMetric: '重要邮件',
    topPriorities: '今天先看',
    pendingPreview: '现在要决定',
    autoSummary: '其余 {count} 个低价值事项已自动处理。',
    pending: '待你确认',
    pendingHeading: '这些动作等你点头',
    pendingDescription: '先看建议动作；原因、风险和来源收在卡片底部。',
    filters: '全部 · 回复 · 会议 · 高风险',
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
    canDo: '自动做',
    mustAsk: '先问我',
    mustNever: '绝不能做',
    canDoText: '营销邮件归档 · 资讯摘要 · 收据标记',
    mustAskText: '客户回复 · 会议改期 · 交付承诺 · 新联系人',
    mustNeverText: '付款 · 签合同 · 法律决定 · 敏感数据',
    canDoExample: '今天已按这些规则清理 2 件事。',
    mustAskExample: 'Maya + 合同时间 = 永远先问你。',
    mustNeverExample: '付款、合同、法律决定直接阻止。',
    activity: '刚刚完成',
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
    synced: 'Synced 12 min ago',
    processed: '42 emails, only 4 need your attention',
    language: 'Language',
    todayBriefing: 'Today Briefing',
    todayHeading: '{count} things need your decision today',
    todaySubheading: 'PAP cleared low-value work and brought the real decisions forward.',
    pendingMetric: 'Need you',
    handledMetric: 'Cleared for you',
    meetingMetric: 'Ready meetings',
    importantMetric: 'Important emails',
    topPriorities: 'Start here',
    pendingPreview: 'Decide now',
    autoSummary: '{count} low-value items were handled automatically.',
    pending: 'Pending Confirmation',
    pendingHeading: 'These actions need your yes',
    pendingDescription: 'Read the suggested action first; reason, risk, and source stay secondary.',
    filters: 'All · Replies · Meetings · High risk',
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
    canDo: 'Automatic',
    mustAsk: 'Ask first',
    mustNever: 'Never',
    canDoText: 'Archive marketing · Summarize newsletters · Label receipts',
    mustAskText: 'Client replies · Reschedules · Commitments · New contacts',
    mustNeverText: 'Payments · Contract signing · Legal decisions · Sensitive data',
    canDoExample: '2 items were cleared by these rules today.',
    mustAskExample: 'Maya + contract timing = always ask you.',
    mustNeverExample: 'Payments, contracts, and legal decisions are blocked.',
    activity: 'Just done',
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
  const briefing = useMemo(() => runPapV1Pipeline(), []);
  const [locale, setLocale] = useState<Locale>('zh');
  const [results, setResults] = useState<ActionResult[]>([]);
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const t = copy[locale];

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

  function recordResult(title: string, status: ActionStatus, id = `${status}_${title}`) {
    setResults((current) => [
      ...current.filter((result) => result.id !== id),
      { id, title, status },
    ]);
  }

  function recordActionResult(action: SuggestedAction, status: ActionStatus) {
    recordResult(localizedAction(action, locale).title, status, action.id);
  }

  function startEdit(action: SuggestedAction) {
    setEditingActionId(action.id);
    const localized = localizedAction(action, locale);
    setDraft(editedDrafts[action.id] ?? localized.preparedReply ?? localized.summary);
  }

  function saveEdit(action: SuggestedAction) {
    setEditedDrafts((current) => ({ ...current, [action.id]: draft }));
    setEditingActionId(null);
    setDraft('');
  }

  return (
    <AppShell locale={locale} onLocaleChange={setLocale}>
      <section id="today" className="space-y-6">
        <PageHeader
          eyebrow={t.todayBriefing}
          title={interpolate(t.todayHeading, pendingActions.length)}
          description={t.todaySubheading}
        />
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionPanel title={t.pendingPreview} description={t.neverSend} priority>
            <div className="space-y-4">
              {pendingActions.slice(0, 2).map((action) => (
                <PendingConfirmationCard
                  key={action.id}
                  action={action}
                  email={emailsById.get(action.emailId)}
                  locale={locale}
                  compact
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
          </SectionPanel>
          <div className="space-y-4">
            <MetricGrid
              metrics={[
                { label: t.pendingMetric, value: pendingActions.length },
                { label: t.handledMetric, value: automaticActions.length },
                { label: t.meetingMetric, value: briefing.meetingSuggestions.length },
                { label: t.importantMetric, value: briefing.importantEmails.length },
              ]}
            />
            <SectionPanel title={t.topPriorities} description={interpolate(t.autoSummary, briefing.lowValueHandledCount)}>
              <BriefingPriorityList priorities={briefing.topPriorities.slice(0, 3)} locale={locale} />
            </SectionPanel>
          </div>
        </div>
      </section>

      <section id="pending" className="space-y-6">
        <PageHeader eyebrow={t.pending} title={t.pendingHeading} description={t.pendingDescription} />
        <div className="rounded-2xl border border-emerald-300/10 bg-stone-950/50 px-4 py-3 text-sm text-stone-300">
          {t.filters}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {pendingActions.map((action) => (
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

      <section id="meetings" className="space-y-6">
        <PageHeader eyebrow={t.meeting} title={t.meetingHeading} description={t.meetingDescription} />
        <div className="grid gap-4 lg:grid-cols-2">
          {briefing.meetingSuggestions.map((suggestion) => (
            <MeetingSuggestionCard
              key={suggestion.emailId}
              suggestion={suggestion}
              email={emailsById.get(suggestion.emailId)}
              locale={locale}
              onUseSlot={(title) => recordResult(title, 'slotUsed', `${suggestion.emailId}_slot`)}
              onMoreTimes={(title) => recordResult(title, 'moreOptions', `${suggestion.emailId}_more`)}
            />
          ))}
        </div>
      </section>

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

      <ActivityPanels locale={locale} results={results} />

      <section id="boundaries" className="space-y-6">
        <PageHeader eyebrow={t.boundaries} title={t.boundaries} description={t.boundariesDescription} />
        <AutomationBoundarySection locale={locale} />
      </section>
    </AppShell>
  );
}

function AppShell(props: { locale: Locale; onLocaleChange: (locale: Locale) => void; children: ReactNode }) {
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
            <div className="mt-auto pt-6">
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

  return (
    <header className="rounded-[2rem] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,#155e4f,transparent_34%),linear-gradient(135deg,#10211d,#050807)] p-5 shadow-2xl shadow-black/25 md:flex md:items-center md:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-emerald-200">{t.demoWorkspace}</p>
        <p className="mt-3 text-2xl font-semibold text-stone-50">{t.processed}</p>
      </div>
      <div className="mt-4 rounded-2xl bg-emerald-300 px-5 py-4 text-emerald-950 md:mt-0">
        <p className="text-sm font-medium">{t.synced}</p>
        <p className="text-lg font-semibold">2026-05-04</p>
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
  compact?: boolean;
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
      <div className="mt-4">
        <h3 className="text-2xl font-semibold leading-tight text-stone-50">{action.title}</h3>
        <p className="mt-2 text-base leading-7 text-stone-200">{action.recommendation}</p>
      </div>
      <div className="mt-4 rounded-2xl bg-[#07110f] p-4 ring-1 ring-white/5">
        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{t.preparedDraft}</p>
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
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-stone-200">{preparedDraft ?? t.noDraftNeeded}</p>
        )}
      </div>
      <div className="mt-4 grid gap-3 rounded-2xl bg-[#07110f] p-4 text-sm ring-1 ring-white/5 md:grid-cols-3">
        <DetailLine label={t.source}>{action.sourceSummary}</DetailLine>
        <DetailLine label={t.why}>{action.rationale}</DetailLine>
        <DetailLine label={t.riskNote}>{action.riskNote}</DetailLine>
      </div>
      {props.email && <OriginalEmail email={props.email} locale={props.locale} />}
      <p className="mt-4 text-sm font-medium text-amber-200">{t.neverSend}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-semibold text-emerald-950" onClick={props.onConfirm}>{t.confirm}</button>
        <button className="rounded-full bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200" onClick={props.onEdit}>{t.edit}</button>
        <button className="rounded-full bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-200" onClick={props.onReject}>{t.reject}</button>
        {!props.compact && (
          <button className="rounded-full border border-emerald-300/30 px-4 py-2.5 text-sm font-semibold text-emerald-100" onClick={props.onRuleAction}>{action.ruleAction}</button>
        )}
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

function AutomationBoundarySection(props: { locale: Locale }) {
  const t = copy[props.locale];
  const sections = [
    { title: t.canDo, body: t.canDoText, example: t.canDoExample, tone: 'emerald' },
    { title: t.mustAsk, body: t.mustAskText, example: t.mustAskExample, tone: 'amber' },
    { title: t.mustNever, body: t.mustNeverText, example: t.mustNeverExample, tone: 'rose' },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {sections.map((section) => (
        <article key={section.title} className="rounded-3xl border border-emerald-300/10 bg-stone-950/70 p-5 shadow-lg shadow-black/20">
          <h3 className="text-lg font-semibold text-stone-50">{section.title}</h3>
          <p className="mt-3 text-sm leading-6 text-stone-300">{section.body}</p>
          <p className="mt-5 rounded-2xl bg-[#07110f] p-4 text-sm text-emerald-100 ring-1 ring-white/5">{section.example}</p>
        </article>
      ))}
    </div>
  );
}

function ActivityPanels(props: { locale: Locale; results: ActionResult[] }) {
  const t = copy[props.locale];
  const panels: Array<{ status: ActionStatus; title: string; prefix: string }> = [
    { status: 'confirmed', title: t.confirmedTitle, prefix: t.confirmedPrefix },
    { status: 'rejected', title: t.rejectedTitle, prefix: t.rejectedPrefix },
    { status: 'undone', title: t.undoneTitle, prefix: t.undonePrefix },
    { status: 'wrong', title: t.wrongTitle, prefix: t.wrongPrefix },
    { status: 'alwaysAsk', title: t.alwaysAskTitle, prefix: t.alwaysAskPrefix },
    { status: 'slotUsed', title: t.slotUsedTitle, prefix: t.slotUsedPrefix },
    { status: 'moreOptions', title: t.moreOptionsTitle, prefix: t.moreOptionsPrefix },
  ];
  const activePanels = panels
    .map((panel) => ({ ...panel, results: props.results.filter((result) => result.status === panel.status) }))
    .filter((panel) => panel.results.length > 0);

  if (activePanels.length === 0) return null;

  return (
    <section className="space-y-4" aria-label={t.activity}>
      <PageHeader eyebrow={t.activity} title={t.activity} description="" />
      <div className="grid gap-4 lg:grid-cols-2">
        {activePanels.map((panel) => (
          <SectionPanel key={panel.status} title={panel.title} description="">
            <ul className="space-y-2 text-sm text-stone-300">
              {panel.results.map((result) => (
                <li key={`${result.status}-${result.id}`} className="rounded-2xl bg-stone-950/60 p-4">
                  {panel.prefix}{result.title}
                </li>
              ))}
            </ul>
          </SectionPanel>
        ))}
      </div>
    </section>
  );
}

function InfoBlock(props: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{props.label}</p>
      <p className="mt-1 text-sm leading-6 text-stone-300">{props.children}</p>
    </div>
  );
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
  return template.replace('{count}', String(count));
}

function formatTimeInZone(value: string, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}
