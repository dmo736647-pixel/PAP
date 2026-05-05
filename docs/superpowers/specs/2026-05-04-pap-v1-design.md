# PAP V1 Design

## 1. Product Positioning

PAP V1 is an AI email and calendar agent for digital nomads, founders, and managers. It is not a chatbot. Its job is to reduce information noise, centralize decisions, and automatically handle low-risk routine work.

The first product promise is: PAP helps users stop living in their inbox by turning email and calendar activity into a small set of briefings, confirmed actions, and transparent automations.

V1 starts with Gmail and Google Calendar. Outlook and Microsoft Graph can follow after the core workflow is validated.

## 2. Target Users

The initial target users are cross-border autonomous workers:

- Digital nomads who manage work across languages, countries, and time zones.
- Founders and managers who deal with high-volume email, meetings, and coordination.
- Independent consultants or small-team operators who need professional communication but lack administrative support.

Their shared pain is not lack of chat. Their pain is excessive coordination load, too many messages, time-zone friction, and frequent low-value decisions.

## 3. V1 Scope

V1 combines three routes:

1. Daily briefing and pending-confirmation workspace as the main user habit.
2. Meeting coordination as the distinctive agentic feature.
3. Email triage and low-risk automation as the automation layer.

V1 should prove that users are willing to let PAP process their email and calendar every day.

### 3.1 V1 PRD Summary

#### Problem

Cross-border autonomous workers lose time because email, calendar, and coordination decisions are scattered across inbox threads and meeting tools. They do not need another chat surface. They need a daily operating layer that turns noisy inputs into clear decisions, safe automation, and prepared next steps.

#### V1 Product Hypothesis

If PAP can reliably classify email/calendar activity, surface only the decisions that need human judgment, and visibly handle low-risk work, users will begin their workday in PAP instead of their inbox and will voluntarily grant more automation permissions over time.

#### Primary User Stories

- As a founder, I want to open one daily briefing so I can understand what needs attention without scanning every email.
- As a consultant, I want important replies drafted and waiting for confirmation so I can respond faster without losing control of my voice.
- As a digital nomad, I want meeting requests converted into time-zone-aware candidate slots so I can avoid coordination back-and-forth.
- As a manager, I want low-value emails archived, labeled, or summarized automatically so my inbox does not become my task list.
- As a privacy-sensitive user, I want to see what PAP did and why so I can trust automation without reading a settings manual.

#### V1 Success Criteria

V1 is successful if a user can complete this loop in under five minutes:

1. Connect or simulate email/calendar input.
2. Open Today Briefing.
3. Review the top priorities.
4. Confirm, edit, or reject pending actions.
5. See which low-risk items PAP handled automatically.
6. Use a meeting suggestion to prepare a response.
7. Adjust at least one automation boundary based on what PAP learned.

#### Functional Requirements

| Area | Requirement | V1 Acceptance Criteria |
| --- | --- | --- |
| Daily Briefing | Generate a concise daily operating summary. | Shows top priorities, important emails, meetings, pending confirmations, and automatically handled counts. |
| Pending Confirmation | Centralize medium/high-risk decisions. | Every card includes context, recommendation, rationale, risk note, and Confirm/Edit/Reject actions. |
| Email Triage | Classify incoming email by value, risk, and reply need. | Marketing/newsletter/notification/meeting/important categories are visible or reflected in actions. |
| Low-Risk Automation | Execute allowed organization actions. | Archived, labeled, summarized, or no-reply-needed items appear in Automatically Handled. |
| Meeting Coordination | Convert meeting requests into candidate slots. | Shows 2-3 slots with conflict/deep-work rationale and a draftable response path. |
| Automation Boundaries | Let users define what PAP may do. | Auto, Confirm, and Block categories are visible from the main workflow and settings page. |
| Audit Visibility | Explain what happened after automation. | Automatically Handled shows action, reason, source item, risk level, and undo availability where possible. |

#### Non-Functional Requirements

- PAP should feel faster than checking the inbox manually; the main dashboard must load from precomputed briefing data when possible.
- High-risk actions must always require confirmation, regardless of model confidence.
- Empty states must explain the value of the page and show example cards during the demo/prototype.
- The UI should prioritize concrete utility over abstract trust language.
- The product should remain useful even before full learning is available by starting from explicit preferences and deterministic rules.

## 4. Explicit Non-Goals

V1 does not include:

- Social media takeover.
- WeChat, WhatsApp, Telegram, or Slack aggregation.
- Automatic payments.
- Automatic contract signing.
- Blockchain identity networks.
- PAP-to-PAP trusted agent communication.
- Full autonomous international business negotiation.
- Biometric emotional triage.

These belong to later product generations after V1 earns user trust and validates daily utility.

## 5. Core Product Experience

### 5.1 Today Briefing

Today Briefing is the default landing page and the top of the PAP daily loop. It should answer: "What matters today, what is waiting for me, and what did PAP already remove from my plate?"

PAP generates a daily briefing at a user-selected time. The briefing includes:

- The most important emails.
- Today's meetings.
- Meeting conflicts and time-zone warnings.
- People waiting for a response.
- Items waiting for user confirmation.
- The number of low-value emails PAP handled.
- The top 3-5 recommended priorities.

The purpose is to make PAP the first workspace users open each day instead of their inbox.

Primary actions:

- Open a pending-confirmation item.
- Jump to a meeting suggestion.
- Review automatically handled items.
- Mark a priority as done or not relevant.
- Ask PAP to explain why an item was included.

Empty state:

- Show "No urgent decisions yet" plus the count of emails PAP already processed.
- Offer a sample briefing card in demo mode so the product value remains visible.

### 5.2 Pending Confirmation

Pending Confirmation is the most important V1 surface. It contains all medium- and high-risk items, including:

- Drafted important replies.
- Meeting reschedule suggestions.
- Meeting acceptance decisions.
- Delivery-time commitments.
- Customer or partner follow-ups.
- Suggestions to add a new automation rule.

Each card should show:

- What happened.
- What PAP recommends.
- Why PAP recommends it.
- Risk notes.
- Source email or calendar context.
- Confirm, edit, or reject actions.

Card states:

- Ready to confirm: PAP has a complete suggested action.
- Needs review: PAP detected risk or missing context and asks for guidance.
- Edited: the user changed PAP's draft or selected a different meeting slot.
- Rejected: the user rejected PAP's recommendation and may provide correction feedback.
- Completed: the action was confirmed and moved into the audit trail.

Primary actions:

- Confirm suggested action.
- Edit draft or meeting slot.
- Reject recommendation.
- Always confirm similar items.
- Allow PAP to automate similar low-risk items in the future.

### 5.3 Automatically Handled

This page shows what PAP already did for the user, such as:

- Archived marketing emails.
- Labeled receipts or invoices.
- Identified no-reply-needed messages.
- Summarized newsletter content.
- Detected duplicate meeting invitations.
- Created reminders.
- Sent standard low-risk confirmations when explicitly allowed.

This page is essential for trust. PAP must be visibly automated, not silently automated.

Each log item should include:

- Action taken.
- Original source item.
- Automation rule or rationale.
- Risk level.
- Whether undo is available.
- Feedback actions such as "wrong", "do this again", or "always ask me".

Primary actions:

- Undo where technically possible.
- Open source email/thread.
- Convert an automation into a stricter rule.
- Give correction feedback.

### 5.4 Meeting Coordination

PAP reads email and calendar context to:

- Detect meeting requests.
- Determine participant time zones.
- Find available time slots.
- Detect schedule conflicts.
- Recommend 2-3 candidate times.
- Draft meeting replies.
- Send standard coordination messages in low-risk scenarios if allowed.

Example output:

> The other person wants to meet next week. You are available at Tuesday 10:00, Wednesday 14:00, and Thursday 09:30 in their time zone. I recommend Wednesday 14:00 because it avoids interrupting your deep work block.

Meeting suggestion cards should show:

- Request summary.
- Participant time zones.
- Candidate slots in both user and recipient time zones.
- Conflicts avoided.
- Deep-work or travel constraints avoided.
- Draft reply using the user's preferred tone.

Primary actions:

- Use recommended slot.
- Choose another slot.
- Edit reply.
- Ask PAP for more options.
- Mark sender as always-confirm or meeting-safe.

### 5.5 Automation Boundary Settings

Users configure what PAP may do automatically:

- What to archive automatically.
- What to reply to automatically.
- Contacts that always require confirmation.
- Keywords that trigger high risk.
- Meetings that may be accepted automatically.
- Work hours, deep work hours, and time-zone preferences.
- Tone preferences such as formal, concise, friendly, assertive, or indirect.

The settings page should use three practical sections instead of abstract trust copy:

- PAP can do automatically.
- PAP must ask me first.
- PAP must never do.

Each section should show real examples from recent email/calendar activity when available.

## 6. Page Flow and Information Architecture

### 6.1 Navigation Structure

V1 should use five primary surfaces:

1. Today Briefing: default landing page and daily entry point.
2. Pending Confirmation: decision queue for medium/high-risk actions.
3. Automatically Handled: automation log and correction surface.
4. Meeting Coordination: scheduling suggestions and draft replies.
5. Automation Boundaries: permission rules, important contacts, work hours, and tone preferences.

Secondary surfaces:

- Source detail drawer for email/thread/calendar context.
- Action audit detail view.
- Onboarding connection flow.
- Empty/demo state examples.

### 6.2 First-Run Onboarding Flow

1. Welcome: explain PAP in one sentence as an email/calendar agent, not a chatbot.
2. Connect Gmail and Google Calendar, or load demo data in prototype mode.
3. Set work mode: founder, manager, consultant, digital nomad, or custom.
4. Set time zone, work hours, and deep-work blocks.
5. Pick important contacts or import suggested contacts from recent threads.
6. Choose default tone.
7. Choose initial automation boundaries:
   - Archive obvious marketing.
   - Summarize newsletters.
   - Label receipts/invoices.
   - Draft replies but ask before sending.
   - Never auto-send commitments, prices, contracts, payments, or sensitive information.
8. Land on Today Briefing with an explanation of what PAP processed.

### 6.3 Daily Use Flow

1. PAP syncs recent email and calendar activity.
2. PAP classifies, scores, and risk-gates items.
3. PAP executes explicitly allowed low-risk actions.
4. PAP creates pending-confirmation cards for anything that needs judgment.
5. PAP generates Today Briefing.
6. User opens Today Briefing.
7. User handles pending confirmations from the highest-priority cards.
8. User reviews automatically handled work only when something looks surprising.
9. PAP learns from confirmations, edits, rejects, and correction feedback without expanding permissions silently.

### 6.4 Pending Confirmation Flow

1. User opens a card from Today Briefing or the Pending Confirmation page.
2. PAP shows the source context, recommendation, rationale, and risk note.
3. User chooses one of three main paths:
   - Confirm: PAP executes the suggested action and writes an audit record.
   - Edit: user modifies the draft, time slot, or decision before execution.
   - Reject: PAP records the rejection and asks whether similar items should be handled differently.
4. After completion, the card leaves Pending Confirmation and appears in the audit trail.

### 6.5 Meeting Coordination Flow

1. PAP detects a meeting request in email.
2. PAP checks calendar availability, work hours, deep-work blocks, and participant time zones.
3. PAP proposes 2-3 candidate slots with rationale.
4. PAP drafts a reply in the user's preferred tone.
5. User confirms or edits the reply.
6. PAP sends the reply only after confirmation unless the sender and scenario are explicitly allowed for low-risk automation.

### 6.6 Automation Feedback Flow

1. User sees an automatically handled item.
2. If correct, no action is needed.
3. If wrong, user marks it as wrong and chooses:
   - Undo this action.
   - Always ask me for similar items.
   - Never automate this sender/topic.
   - Adjust the matching rule.
4. PAP updates preferences or suggests a new rule for confirmation.

## 7. Page Wireframes

The V1 prototype should use a workbench layout: left navigation, top status summary, and card-based task surfaces. The visual priority is the user's next decision, not PAP's explanations.

### 7.1 Today Briefing Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ PAP V1                                      Synced 12 min ago        │
├───────────────┬─────────────────────────────────────────────────────┤
│ Today         │ Good morning. PAP processed 42 emails and 7 events. │
│ Pending       │                                                     │
│ Automated     │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │
│ Meetings      │ │ Confirm 4   │ │ Auto 18     │ │ Meetings 3  │     │
│ Boundaries    │ └─────────────┘ └─────────────┘ └─────────────┘     │
│               │                                                     │
│               │ Top priorities                                      │
│               │ ┌───────────────────────────────────────────────┐   │
│               │ │ 1. Review Maya's contract timing reply         │   │
│               │ │ 2. Pick a slot for Alex's product demo call    │   │
│               │ │ 3. PAP archived 12 low-value promotions        │   │
│               │ └───────────────────────────────────────────────┘   │
│               │                                                     │
│               │ Pending confirmations                              │
│               │ ┌──────────────┐ ┌──────────────┐                  │
│               │ │ Contract     │ │ Meeting slot │                  │
│               │ │ Confirm/Edit │ │ Confirm/Edit │                  │
│               │ └──────────────┘ └──────────────┘                  │
└───────────────┴─────────────────────────────────────────────────────┘
```

Content priority:

1. Pending-confirmation count and first 2-3 cards.
2. Meeting coordination suggestions.
3. Automatically handled count with one reassuring example.
4. Secondary important emails.

### 7.2 Pending Confirmation Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Pending Confirmation                         4 waiting for you       │
├─────────────────────────────────────────────────────────────────────┤
│ Filters: All | Replies | Meetings | High risk | New rules           │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ High risk · Client · Contract                                  │ │
│ │ Maya asks whether the contract can be ready by Friday.          │ │
│ │ PAP recommends: Draft a cautious reply without committing yet.  │ │
│ │ Why: contract + delivery timing require confirmation.           │ │
│ │ Source: Re: Proposal timing                                    │ │
│ │ [Confirm] [Edit draft] [Reject] [Always ask for contracts]      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Source detail drawer opens from the right when a card is selected.  │
└─────────────────────────────────────────────────────────────────────┘
```

Card hierarchy:

1. Risk/contact/category chip.
2. One-sentence source summary.
3. Recommended action.
4. Rationale and risk note.
5. Primary actions.
6. Rule-learning action.

### 7.3 Automatically Handled Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Automatically Handled                     18 actions today           │
├─────────────────────────────────────────────────────────────────────┤
│ Summary: PAP removed low-value work. Nothing was sent as you.        │
│                                                                     │
│ ┌──────────────────────┐ ┌──────────────────────┐                  │
│ │ Archived promotion   │ │ Summarized newsletter │                  │
│ │ Rule: marketing      │ │ Rule: newsletter      │                  │
│ │ Undo available       │ │ View summary          │                  │
│ │ [Undo] [Wrong]       │ │ [Open] [Always ask]   │                  │
│ └──────────────────────┘ └──────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

This page should reassure through concrete logs, not long trust claims. The most important copy is what PAP did and whether the user can undo or correct it.

### 7.4 Meeting Coordination Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Meeting Coordination                         3 requests detected     │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Alex wants to discuss the product demo next Tuesday.            │ │
│ │ Recipient: America/New_York · You: Europe/Berlin                │ │
│ │                                                                 │ │
│ │ Recommended slots                                               │ │
│ │ ○ Tue 15:00 Berlin / 09:00 New York · avoids deep work          │ │
│ │ ○ Wed 16:00 Berlin / 10:00 New York · no conflicts              │ │
│ │ ○ Thu 14:30 Berlin / 08:30 New York · earliest open slot        │ │
│ │                                                                 │ │
│ │ Draft reply                                                     │ │
│ │ "Tuesday 9:00 your time works well. Does that fit your side?"  │ │
│ │ [Use slot] [Edit reply] [More options]                          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.5 Automation Boundaries Wireframe

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Automation Boundaries                                                │
├─────────────────────────────────────────────────────────────────────┤
│ PAP can do automatically                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Archive obvious marketing · Summarize newsletters · Label bills │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ PAP must ask me first                                                │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Client replies · Meeting changes · Commitments · New contacts   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ PAP must never do                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Payments · Contract signing · Legal decisions · Sensitive data   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

Settings should be grounded in examples: "3 recent emails matched this rule" is more useful than abstract permission language.

## 8. Demo Copy

### 8.1 Product One-Liner

PAP is your email and calendar agent: it clears low-value work, prepares decisions, and asks before anything important happens.

### 8.2 Onboarding Copy

- Welcome title: "Stop starting your day in the inbox."
- Welcome body: "PAP reads your email and calendar, removes routine noise, and brings only the important decisions back to you."
- Connection CTA: "Connect Gmail and Calendar"
- Demo CTA: "Try with sample workspace"
- Permission reassurance: "PAP will not send replies, accept meetings, or make commitments unless you explicitly allow it."

### 8.3 Today Briefing Copy

- Header: "Here's what needs your attention today."
- Subheader: "PAP processed your inbox and calendar so you can start from decisions, not messages."
- Empty state: "No urgent decisions yet. PAP is still watching for replies, conflicts, and routine work it can handle."
- Auto summary: "PAP handled {count} low-value items while keeping important decisions here."

### 8.4 Pending Confirmation Copy

- Header: "Waiting for your approval"
- Subheader: "These actions involve relationships, commitments, timing, or sensitive context."
- Confirm button: "Confirm"
- Edit button: "Edit first"
- Reject button: "Reject"
- Rule action: "Handle similar items this way"
- High-risk note: "PAP will never send this without your confirmation."

### 8.5 Automatically Handled Copy

- Header: "Already handled"
- Subheader: "PAP only took actions inside your automation boundaries."
- Undo label: "Undo"
- Correction label: "This was wrong"
- Trust line: "Nothing was sent as you unless you explicitly allowed that category."

### 8.6 Meeting Coordination Copy

- Header: "Meeting requests PAP found"
- Subheader: "Suggested slots avoid conflicts, deep work, and time-zone surprises."
- Recommended label: "Recommended"
- Draft label: "Prepared reply"
- More options CTA: "Find more times"

## 9. UI Component List

### 9.1 Layout Components

- `AppShell`: left navigation, top sync status, responsive content container.
- `PageHeader`: title, short value proposition, primary metric or status.
- `MetricGrid`: compact count cards for pending, automated, meetings, and important emails.
- `SectionPanel`: reusable card section with title, description, and actions.
- `SourceDrawer`: right-side detail drawer for email thread, calendar event, and audit history.

### 9.2 Product Components

- `BriefingPriorityList`: ranked list of top daily priorities.
- `PendingConfirmationCard`: recommendation card with risk chip, rationale, and Confirm/Edit/Reject actions.
- `AutomationLogCard`: visible record of automatic action, rule, undo state, and correction actions.
- `MeetingSuggestionCard`: request summary, participant time zones, proposed slots, and draft reply.
- `AutomationBoundarySection`: Auto/Confirm/Never sections with concrete examples and editable rules.
- `RiskChip`: low/medium/high visual indicator.
- `ActionRationale`: compact explanation of why PAP recommended or executed an action.
- `FeedbackActions`: wrong, always ask, automate similar, and adjust rule controls.

### 9.3 Prototype Data Components

- `DemoDataToggle`: switch between sample workspace and future connected account state.
- `EmptyStateExample`: demo-friendly empty state with sample cards.
- `SyncStatus`: shows last processed time, number of emails/events scanned, and connection state.

### 9.4 Implementation Priority

1. `AppShell`, `PageHeader`, and `MetricGrid`.
2. Today Briefing with `BriefingPriorityList`.
3. `PendingConfirmationCard` because it is the main V1 value surface.
4. `AutomationLogCard` to make automation visible.
5. `MeetingSuggestionCard` for differentiated agentic value.
6. `AutomationBoundarySection` after the main utility loop is clear.

## 10. Architecture

V1 uses a cloud SaaS MVP while preserving a path toward hybrid deployment. The architecture should allow privacy-sensitive users to later choose local-first or private-cloud/BYOK processing.

### 10.1 Data Ingestion Layer

Responsibilities:

- Gmail API integration.
- Google Calendar API integration.
- OAuth authorization.
- Webhook or scheduled sync.
- Email body, thread, label, and metadata sync.
- Calendar event and availability sync.

V1 should avoid overexpanding integrations. Gmail and Google Calendar are enough for the first validation loop.

### 10.2 User Context Layer

Responsibilities:

- User time zone.
- Work hours.
- Deep work hours.
- Common languages.
- Tone preferences.
- Important contacts.
- Automation permission rules.
- Historical confirm/reject behavior.

This layer is the beginning of PAP's long-term moat. PAP should learn which contacts matter, which messages users ignore, and which meetings users usually reject. Learned preferences may recommend rule changes, but should not silently expand permissions.

### 10.3 Information Triage Layer

Responsibilities:

- Email classification.
- Importance scoring.
- Urgency and emotional tone detection.
- Reply-needed detection.
- Meeting-intent detection.
- High-risk content detection, including commitments, prices, contracts, legal topics, payments, and sensitive information.
- Decision on whether an item can be automated.

This is the core judgment layer.

### 10.4 Agent Execution Layer

Responsibilities:

- Archive email.
- Apply labels.
- Generate summaries.
- Draft replies.
- Recommend meeting times.
- Generate calendar invitations.
- Send low-risk standard replies if authorized.
- Create pending-confirmation cards.

Every action must include:

- Action type.
- Confidence.
- Risk level.
- Evidence.
- Whether confirmation is required.
- Rollback state where possible.

### 10.5 Confirmation and Audit Layer

Responsibilities:

- Pending-confirmation queue.
- Automatically-handled log.
- Operation audit trail.
- Undo entry points.
- Automation rule change history.
- User feedback: correct, incorrect, always automate, always confirm.

The more automatic PAP becomes, the more visible this layer must be.

### 10.6 Model Orchestration Layer

PAP should not depend on a single model for all tasks. V1 can use different model paths:

- Fast model for classification, labeling, and low-risk judgments.
- Strong model for important email interpretation, complex replies, and meeting-context reasoning.
- Embeddings/RAG for contact history, user preferences, and thread context.
- Rules engine for hard safety boundaries.

High-risk decisions cannot rely only on model judgment. Rules must override model output.

## 11. Data Flow

### 11.1 Sync

After the user connects Gmail and Google Calendar, PAP syncs:

- New emails.
- Email threads.
- Sender metadata.
- Labels and folders.
- Calendar events.
- Free/busy windows.
- Meeting invitations.

V1 should not sync all history by default. Recommended limits:

- Recent 30-90 days of email.
- Threads involving important contacts.
- Future 60 days of calendar events.
- Historical threads the user explicitly marks as important.

### 11.2 Parse

Each new email becomes a structured object:

- Sender identity.
- Whether the sender is important.
- Topic.
- Whether a reply is needed.
- Whether a meeting is involved.
- Time, place, money, or commitment references.
- Urgency and emotional tone.
- Recommended action.
- Risk level.

### 11.3 Decide

PAP combines model judgment, user rules, and historical behavior:

- Low-value marketing email: archive or summarize.
- Notification: mark as low priority.
- Meeting request: recommend candidate times.
- Simple acknowledgement: send automatically only if allowed.
- Important customer email: enter Pending Confirmation.
- Price, contract, payment, legal, or sensitive topic: force confirmation.

### 11.4 Execute

Before action execution, PAP applies risk gates:

- Low risk and explicitly authorized: execute automatically.
- Medium risk: suggest and require confirmation.
- High risk: summarize and warn; do not execute.

All actions go to the audit log and should support undo where possible.

### 11.5 Learn

User confirmations, edits, and rejections become preference signals:

- Contact importance.
- Which email types can be archived.
- Preferred reply tone.
- Preferred meeting times.
- Actions that always require confirmation.

V1 must not allow implicit learning to expand authority boundaries. Permission boundaries must remain explicit.

## 12. Automation Strategy

The V1 rule is: automatically handle organization and low-commitment actions; confirm relationship and commitment actions.

### 12.1 Automatic

- Classification.
- Labeling.
- Archiving.
- Summaries.
- Low-value email digesting.
- Duplicate meeting detection.
- Availability recommendation.

### 12.2 Optional Automatic

Only if the user explicitly allows:

- "Received, thank you."
- "I will get back to you later."
- "Could you send more information?"
- Accepting low-risk meeting invitations from whitelisted contacts.

### 12.3 Must Confirm

- Formal customer replies.
- Rejecting collaboration.
- Pricing or quotes.
- Delivery-time commitments.
- Rescheduling important meetings.
- Contracts, legal topics, payments, or sensitive information.

## 13. Suggested Technical Stack

### 13.1 Frontend

- Next.js / React.
- Tailwind CSS.
- shadcn/ui or similar component library.
- Responsive web app first; no native app in V1.

The core surface is a high-frequency workbench, so web is the fastest validation path.

### 13.2 Backend

- Node.js / TypeScript.
- PostgreSQL.
- Redis / BullMQ for asynchronous jobs.
- Prisma or Drizzle ORM.
- API layer for users, authorization, tasks, audit logs, and automation rules.

### 13.3 AI Tasks

Separate AI work into task-specific pipelines:

- Email classifier.
- Importance scorer.
- Risk judge.
- Meeting-intent detector.
- Reply drafter.
- Daily briefing generator.
- User preference extractor.

The system should behave like a reliable pipeline, not a single unconstrained autonomous agent.

### 13.4 Core Data Objects

- User.
- ConnectedAccount.
- EmailMessage.
- EmailThread.
- CalendarEvent.
- Contact.
- UserPreference.
- AutomationRule.
- SuggestedAction.
- ActionAuditLog.
- DailyBriefing.

## 14. Security and Privacy

V1 must include:

- Encrypted OAuth token storage.
- Minimum required OAuth scopes.
- Controls for email-body access.
- Audit logs.
- User data deletion.
- Forced confirmation for high-risk actions.
- Architecture path for BYOK and private-cloud deployment.

High-risk content triggers include money, contracts, payments, legal topics, quotes, resignation, medical topics, identity information, and other sensitive data. New contacts and important contacts should default to conservative handling. Low confidence should enter Pending Confirmation.

## 15. MVP Development Order

1. User login and Gmail/Calendar authorization.
2. Email and calendar sync.
3. Email classification and risk scoring.
4. Today Briefing.
5. Pending Confirmation queue.
6. Automatically Handled log.
7. Meeting coordination suggestions.
8. Limited automation rules.
9. User feedback learning.

## 16. Validation Metrics

V1 should be evaluated by whether PAP reduces work and earns more authority over time:

- Reduction in daily inbox visits.
- Reduction in time spent processing email.
- Number of low-risk items handled automatically each week.
- Percentage of pending-confirmation items accepted with one click.
- Number of automation permissions users voluntarily enable.
- Whether users treat PAP as their daily work entry point.

## 17. Business Model

Start with subscription pricing:

- Free: daily briefing and basic classification.
- Pro: automation rules, meeting coordination, and pending-confirmation workspace.
- Team/Private: BYOK, private cloud, team mailboxes, and audit controls.

Early positioning should focus on saving 2-5 hours per week for digital nomads, consultants, founders, and managers.

## 18. Main Risks

### 18.1 Trust Risk

Users may worry that PAP will send the wrong message, archive important mail, expose private data, or make incorrect commitments. The mitigation is to make Pending Confirmation, Automatically Handled, undo, and audit logs central product surfaces.

### 18.2 Accuracy Risk

Classification and meeting detection do not need to be perfect, but consequential actions must be conservative. If confidence is low, the item must enter Pending Confirmation.

### 18.3 Cold Start Risk

PAP needs onboarding to learn initial preferences:

- Profession or work mode.
- Connected email and calendar accounts.
- Important contacts.
- Automation boundaries.
- Default tone.
- Email categories that may be automatically processed.

## 19. Product Principle

PAP V1 should be automated, but not reckless. Its personality should be reliable, restrained, and transparent. The product should first earn permission to handle small routine tasks, then gradually earn the right to represent the user in more important contexts.
