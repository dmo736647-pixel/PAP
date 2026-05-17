# PAP Private Alpha Google Data Design

## Goal

Build the first production-shaped PAP private alpha slice: a small invited-user system where users sign in with Google, authorize read-only Gmail and Calendar access, sync a limited snapshot of real data, persist it in PostgreSQL through Prisma, and generate a PAP workspace from that data.

This design focuses on real data ingestion. It does not implement real email sending, calendar mutation, background sync, webhooks, public signup, payments, or production operations.

## Scope

Included:

- Google sign-in as the account system.
- Private alpha invite gating by email address.
- PostgreSQL persistence through Prisma.
- Encrypted Google OAuth token storage.
- Read-only snapshot sync for the most recent 50 Gmail messages.
- Read-only snapshot sync for future 14-day Google Calendar events.
- Sync run status and error tracking.
- Conversion from Google snapshots into the existing PAP domain pipeline.
- PAP workspace generation from real Google data.
- UI states for logged out, not invited, connected, syncing, synced, sync failed, and read-only mode.
- Local development and cloud deployment readiness through environment variables.

Excluded:

- Sending email.
- Modifying calendar events.
- Archiving, deleting, or labeling real Gmail messages.
- Background scheduled sync.
- Gmail watch or Calendar webhook integration.
- Full email body or attachment storage.
- Public registration.
- Production billing, compliance, or operations hardening.

## Architecture

The system is split into five layers.

### 1. Google authentication and authorization

Users sign in through Google OAuth. The OAuth request includes identity scopes plus read-only Gmail and Calendar scopes. The callback creates or updates the local `User`, checks whether the email has an active `AlphaInvite`, and stores encrypted Google credentials for invited users.

Uninvited users can complete Google identity verification but cannot enter the PAP workspace or trigger data sync.

### 2. Prisma and PostgreSQL storage

PostgreSQL stores user identity, invite state, encrypted Google credentials, sync runs, Google data snapshots, and generated PAP workspaces. Local and cloud deployments use the same Prisma schema and differ only by environment variables.

### 3. Read-only Google snapshot sync

A signed-in invited user can trigger sync from the UI or immediately after first authorization. The sync creates a `GoogleSyncRun`, refreshes access tokens when needed, reads the latest Gmail and Calendar data, writes snapshots, and updates the sync run status.

The Gmail sync stores message metadata and snippets for the latest 50 messages. The Calendar sync stores future events from the user's primary calendar for the next 14 days.

### 4. PAP workspace generation

A Google connector reads the latest snapshots for the current user and maps them into the existing PAP domain types:

- `GoogleEmailSnapshot` to `EmailMessage`
- `GoogleCalendarEventSnapshot` to `CalendarEvent`

The existing triage, briefing, and meeting pipeline then generates a `PapWorkspace` with `source = google`. The current demo pipeline remains available for logged-out or demo-only views.

### 5. PAP UI

The UI shows the user's connection and sync state:

- Logged out: Google sign-in entry.
- Not invited: private alpha waiting state.
- Connected but not synced: sync button.
- Syncing: progress state.
- Synced: real Google-data workspace.
- Sync failed: error message, retry action, and last successful workspace if one exists.

The UI must clearly state that this phase is read-only. PAP may show recommended actions, but real execution controls remain disabled or only update local confirmation state.

## Data Model

### `User`

Stores the local account created from Google identity.

Fields:

- `id`
- `email`
- `name`
- `image`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

### `AlphaInvite`

Controls private alpha access.

Fields:

- `id`
- `email`
- `status`: `invited | accepted | revoked`
- `createdAt`
- `acceptedAt`

Only active invited emails can sync Google data or access the private alpha workspace.

### `GoogleCredential`

Stores encrypted OAuth credentials.

Fields:

- `id`
- `userId`
- `googleAccountId`
- `accessTokenEncrypted`
- `refreshTokenEncrypted`
- `scope`
- `expiresAt`
- `createdAt`
- `updatedAt`
- `revokedAt`

Tokens are encrypted before storage and decrypted only inside server-side Google API calls.

### `GoogleSyncRun`

Records each snapshot sync attempt.

Fields:

- `id`
- `userId`
- `status`: `running | succeeded | failed`
- `startedAt`
- `finishedAt`
- `errorMessage`
- `gmailMessageCount`
- `calendarEventCount`

This table powers sync status, last successful sync, and failure display.

### `GoogleEmailSnapshot`

Stores the Gmail fields needed for first-stage PAP workspace generation.

Fields:

- `id`
- `userId`
- `googleMessageId`
- `threadId`
- `from`
- `to`
- `subject`
- `snippet`
- `receivedAt`
- `labels`
- `rawMetadataJson`
- `syncRunId`

The first stage does not store full message bodies or attachments.

### `GoogleCalendarEventSnapshot`

Stores the Calendar fields needed for meeting coordination.

Fields:

- `id`
- `userId`
- `googleEventId`
- `calendarId`
- `title`
- `description`
- `startsAt`
- `endsAt`
- `attendees`
- `rawMetadataJson`
- `syncRunId`

### `PapWorkspace`

Stores the generated PAP workspace for fast UI loading.

Fields:

- `id`
- `userId`
- `source`: `demo | google`
- `status`
- `generatedAt`
- `briefingJson`
- `pendingActionsJson`
- `automaticallyHandledJson`
- `meetingSuggestionsJson`
- `auditEventsJson`

The first stage stores PAP output as JSON to reuse the existing workspace view model. If alpha usage proves the workflow, actions and audit events can be promoted to structured tables later.

## Data Flow

1. User opens PAP.
2. If unauthenticated, the UI shows Google sign-in.
3. User starts Google OAuth.
4. OAuth callback validates identity and checks `AlphaInvite`.
5. Invited users get a local `User`, encrypted `GoogleCredential`, and alpha access.
6. Uninvited users see the waiting state and cannot sync.
7. Invited users trigger read-only sync.
8. The sync creates `GoogleSyncRun(status = running)`.
9. The sync refreshes the access token if needed.
10. Gmail sync reads the latest 50 messages and writes `GoogleEmailSnapshot` rows.
11. Calendar sync reads future 14-day events and writes `GoogleCalendarEventSnapshot` rows.
12. The sync marks the run as `succeeded` with counts or `failed` with a short error.
13. On success, the Google connector maps snapshots into PAP domain inputs.
14. The existing PAP pipeline generates briefing, pending confirmations, automatically handled items, and meeting suggestions.
15. The generated output is written to `PapWorkspace(source = google)`.
16. The UI reads and renders the newest workspace for the current user.

## API Design

### `GET /api/auth/google/start`

Starts Google OAuth with identity, Gmail readonly, and Calendar readonly scopes.

### `GET /api/auth/google/callback`

Handles OAuth callback, validates invite status, creates or updates the user, encrypts and stores Google credentials, and redirects to the app with the correct access state.

### `POST /api/google/sync`

Runs a foreground read-only snapshot sync for the current user. Requires an authenticated invited user.

Outcomes:

- `401` when unauthenticated.
- `403` when not invited.
- Success response with Gmail and Calendar counts.
- Failure response with short error message and failed sync run recorded.

### `GET /api/google/sync/status`

Returns the latest sync run, last successful sync, current connection state, and whether reauthorization is needed.

### `GET /api/alpha/workspace`

Returns the latest workspace for the current user. It can continue returning demo data for unauthenticated demo mode if the current UI needs that behavior.

### `POST /api/auth/logout`

Clears the local session.

## Error Handling

### Unauthenticated request

Protected APIs return `401`. The UI shows Google sign-in.

### Uninvited user

The OAuth callback allows identity verification but blocks product access. Sync APIs return `403`. The UI shows a private alpha waiting state.

### Google authorization failure

The callback displays an authorization failure state. No sync run is created.

### Expired token

The sync tries to refresh the access token. If refresh succeeds, sync continues and the stored credential is updated. If refresh fails, the credential is marked as requiring reauthorization and sync fails without replacing the previous workspace.

### Gmail or Calendar API failure

The sync run is marked `failed`, a short error is stored, and the previous successful workspace remains available.

### Database failure

The API returns failure and does not report a successful sync. Existing workspace data is not overwritten.

## Security Boundaries

- OAuth scopes are read-only for Gmail and Calendar.
- All user data queries include `userId`.
- OAuth tokens are encrypted before database storage.
- Token encryption keys are configured through environment variables and never committed.
- `.env` files are not committed.
- Alpha access is controlled by `AlphaInvite`.
- Full email bodies and attachments are not stored in this stage.
- The system does not send email, modify calendars, archive messages, delete data, or mutate Google resources.
- PAP action buttons for real Google data either remain disabled or only update local confirmation state.

## Testing

### Unit tests

- Invite access check for invited, accepted, revoked, and unknown emails.
- Token encryption and decryption helpers.
- Google email snapshot to `EmailMessage` conversion.
- Google calendar snapshot to `CalendarEvent` conversion.
- Workspace generation from Google snapshot inputs.

### API tests

- `POST /api/google/sync` returns `401` when unauthenticated.
- `POST /api/google/sync` returns `403` when the user is not invited.
- Successful sync writes a `GoogleSyncRun`, email snapshots, calendar snapshots, and a `PapWorkspace`.
- Failed sync records a failed `GoogleSyncRun` and preserves the previous workspace.

### UI smoke tests

- Logged-out UI shows Google sign-in.
- Not-invited UI shows private alpha waiting state.
- Connected-but-not-synced UI shows a sync button.
- Synced UI shows real workspace status.
- Sync-failed UI shows retry and error state.
- Read-only mode is visible.

### Manual verification

- Local Google OAuth callback completes.
- A test invited Google account can sync the latest 50 Gmail messages and 14 days of Calendar events.
- The UI clearly shows read-only status.
- `npm test` passes.
- `npm run build` passes.

## Implementation Notes

The implementation should keep demo mode working while adding the Google data path. Existing PAP domain logic should remain the center of workspace generation; the new work is primarily identity, storage, connector, sync orchestration, and UI state around real data.

The first implementation plan should avoid background workers. A foreground sync endpoint is enough for this alpha milestone and keeps debugging simpler.
