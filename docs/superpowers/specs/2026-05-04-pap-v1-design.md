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

PAP generates a daily briefing at a user-selected time. The briefing includes:

- The most important emails.
- Today's meetings.
- Meeting conflicts and time-zone warnings.
- People waiting for a response.
- Items waiting for user confirmation.
- The number of low-value emails PAP handled.
- The top 3-5 recommended priorities.

The purpose is to make PAP the first workspace users open each day instead of their inbox.

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
- Confirm, edit, or reject actions.

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

### 5.5 Automation Boundary Settings

Users configure what PAP may do automatically:

- What to archive automatically.
- What to reply to automatically.
- Contacts that always require confirmation.
- Keywords that trigger high risk.
- Meetings that may be accepted automatically.
- Work hours, deep work hours, and time-zone preferences.
- Tone preferences such as formal, concise, friendly, assertive, or indirect.

## 6. Architecture

V1 uses a cloud SaaS MVP while preserving a path toward hybrid deployment. The architecture should allow privacy-sensitive users to later choose local-first or private-cloud/BYOK processing.

### 6.1 Data Ingestion Layer

Responsibilities:

- Gmail API integration.
- Google Calendar API integration.
- OAuth authorization.
- Webhook or scheduled sync.
- Email body, thread, label, and metadata sync.
- Calendar event and availability sync.

V1 should avoid overexpanding integrations. Gmail and Google Calendar are enough for the first validation loop.

### 6.2 User Context Layer

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

### 6.3 Information Triage Layer

Responsibilities:

- Email classification.
- Importance scoring.
- Urgency and emotional tone detection.
- Reply-needed detection.
- Meeting-intent detection.
- High-risk content detection, including commitments, prices, contracts, legal topics, payments, and sensitive information.
- Decision on whether an item can be automated.

This is the core judgment layer.

### 6.4 Agent Execution Layer

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

### 6.5 Confirmation and Audit Layer

Responsibilities:

- Pending-confirmation queue.
- Automatically-handled log.
- Operation audit trail.
- Undo entry points.
- Automation rule change history.
- User feedback: correct, incorrect, always automate, always confirm.

The more automatic PAP becomes, the more visible this layer must be.

### 6.6 Model Orchestration Layer

PAP should not depend on a single model for all tasks. V1 can use different model paths:

- Fast model for classification, labeling, and low-risk judgments.
- Strong model for important email interpretation, complex replies, and meeting-context reasoning.
- Embeddings/RAG for contact history, user preferences, and thread context.
- Rules engine for hard safety boundaries.

High-risk decisions cannot rely only on model judgment. Rules must override model output.

## 7. Data Flow

### 7.1 Sync

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

### 7.2 Parse

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

### 7.3 Decide

PAP combines model judgment, user rules, and historical behavior:

- Low-value marketing email: archive or summarize.
- Notification: mark as low priority.
- Meeting request: recommend candidate times.
- Simple acknowledgement: send automatically only if allowed.
- Important customer email: enter Pending Confirmation.
- Price, contract, payment, legal, or sensitive topic: force confirmation.

### 7.4 Execute

Before action execution, PAP applies risk gates:

- Low risk and explicitly authorized: execute automatically.
- Medium risk: suggest and require confirmation.
- High risk: summarize and warn; do not execute.

All actions go to the audit log and should support undo where possible.

### 7.5 Learn

User confirmations, edits, and rejections become preference signals:

- Contact importance.
- Which email types can be archived.
- Preferred reply tone.
- Preferred meeting times.
- Actions that always require confirmation.

V1 must not allow implicit learning to expand authority boundaries. Permission boundaries must remain explicit.

## 8. Automation Strategy

The V1 rule is: automatically handle organization and low-commitment actions; confirm relationship and commitment actions.

### 8.1 Automatic

- Classification.
- Labeling.
- Archiving.
- Summaries.
- Low-value email digesting.
- Duplicate meeting detection.
- Availability recommendation.

### 8.2 Optional Automatic

Only if the user explicitly allows:

- "Received, thank you."
- "I will get back to you later."
- "Could you send more information?"
- Accepting low-risk meeting invitations from whitelisted contacts.

### 8.3 Must Confirm

- Formal customer replies.
- Rejecting collaboration.
- Pricing or quotes.
- Delivery-time commitments.
- Rescheduling important meetings.
- Contracts, legal topics, payments, or sensitive information.

## 9. Suggested Technical Stack

### 9.1 Frontend

- Next.js / React.
- Tailwind CSS.
- shadcn/ui or similar component library.
- Responsive web app first; no native app in V1.

The core surface is a high-frequency workbench, so web is the fastest validation path.

### 9.2 Backend

- Node.js / TypeScript.
- PostgreSQL.
- Redis / BullMQ for asynchronous jobs.
- Prisma or Drizzle ORM.
- API layer for users, authorization, tasks, audit logs, and automation rules.

### 9.3 AI Tasks

Separate AI work into task-specific pipelines:

- Email classifier.
- Importance scorer.
- Risk judge.
- Meeting-intent detector.
- Reply drafter.
- Daily briefing generator.
- User preference extractor.

The system should behave like a reliable pipeline, not a single unconstrained autonomous agent.

### 9.4 Core Data Objects

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

## 10. Security and Privacy

V1 must include:

- Encrypted OAuth token storage.
- Minimum required OAuth scopes.
- Controls for email-body access.
- Audit logs.
- User data deletion.
- Forced confirmation for high-risk actions.
- Architecture path for BYOK and private-cloud deployment.

High-risk content triggers include money, contracts, payments, legal topics, quotes, resignation, medical topics, identity information, and other sensitive data. New contacts and important contacts should default to conservative handling. Low confidence should enter Pending Confirmation.

## 11. MVP Development Order

1. User login and Gmail/Calendar authorization.
2. Email and calendar sync.
3. Email classification and risk scoring.
4. Today Briefing.
5. Pending Confirmation queue.
6. Automatically Handled log.
7. Meeting coordination suggestions.
8. Limited automation rules.
9. User feedback learning.

## 12. Validation Metrics

V1 should be evaluated by whether PAP reduces work and earns more authority over time:

- Reduction in daily inbox visits.
- Reduction in time spent processing email.
- Number of low-risk items handled automatically each week.
- Percentage of pending-confirmation items accepted with one click.
- Number of automation permissions users voluntarily enable.
- Whether users treat PAP as their daily work entry point.

## 13. Business Model

Start with subscription pricing:

- Free: daily briefing and basic classification.
- Pro: automation rules, meeting coordination, and pending-confirmation workspace.
- Team/Private: BYOK, private cloud, team mailboxes, and audit controls.

Early positioning should focus on saving 2-5 hours per week for digital nomads, consultants, founders, and managers.

## 14. Main Risks

### 14.1 Trust Risk

Users may worry that PAP will send the wrong message, archive important mail, expose private data, or make incorrect commitments. The mitigation is to make Pending Confirmation, Automatically Handled, undo, and audit logs central product surfaces.

### 14.2 Accuracy Risk

Classification and meeting detection do not need to be perfect, but consequential actions must be conservative. If confidence is low, the item must enter Pending Confirmation.

### 14.3 Cold Start Risk

PAP needs onboarding to learn initial preferences:

- Profession or work mode.
- Connected email and calendar accounts.
- Important contacts.
- Automation boundaries.
- Default tone.
- Email categories that may be automatically processed.

## 15. Product Principle

PAP V1 should be automated, but not reckless. Its personality should be reliable, restrained, and transparent. The product should first earn permission to handle small routine tasks, then gradually earn the right to represent the user in more important contexts.
