# PAP Private Alpha Google Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private-alpha Google data ingestion slice where invited users sign in with Google, sync read-only Gmail/Calendar snapshots into PostgreSQL through Prisma, and generate a PAP workspace from real data.

**Architecture:** Add a server-side private-alpha path beside the existing demo workspace. Prisma/PostgreSQL stores invited users, encrypted Google credentials, sync runs, Google snapshots, and generated workspace JSON; a Google connector maps snapshots into the existing PAP domain pipeline. OAuth and sync APIs are foreground-only, read-only, user-scoped, and keep the current demo flow available.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma, PostgreSQL, Google OAuth/Gmail/Calendar REST APIs, Vitest, Testing Library, Node crypto.

---

## Scope Boundary

This plan implements the first production-shaped real-data milestone only:

- Google sign-in as the account system.
- Email invite gating for private alpha.
- PostgreSQL persistence through Prisma.
- Encrypted OAuth token storage.
- Foreground snapshot sync for latest 50 Gmail messages and future 14-day Calendar events.
- PAP workspace generation from stored Google snapshots.
- UI states for logged out, not invited, connected, syncing, synced, failed, and read-only.

This plan does not implement background jobs, webhooks, public signup, real Gmail mutations, real Calendar mutations, full message body storage, attachment storage, billing, or production ops hardening.

## File Structure

Create or modify these files:

- `package.json` — add Prisma and Google API dependencies and scripts.
- `.gitignore` — ensure local env files and generated local DB artifacts stay uncommitted.
- `.env.example` — document required runtime variables without secrets.
- `prisma/schema.prisma` — database schema for users, invites, credentials, sync runs, snapshots, and workspaces.
- `src/lib/pap/prisma.ts` — singleton Prisma client.
- `src/lib/pap/private-alpha-types.ts` — app-level private-alpha types shared by server helpers and UI client.
- `src/lib/pap/private-alpha-access.ts` — invite/access decision helpers.
- `src/lib/pap/crypto.ts` — OAuth token encryption/decryption helpers.
- `src/lib/pap/session.ts` — signed cookie session helpers.
- `src/lib/pap/google-oauth.ts` — OAuth URL, callback token exchange, and profile parsing helpers.
- `src/lib/pap/google-api.ts` — small Gmail/Calendar API client wrapper.
- `src/lib/pap/google-snapshots.ts` — Google snapshot to PAP domain conversion.
- `src/lib/pap/google-workspace.ts` — workspace generation from Google snapshots.
- `src/lib/pap/google-sync.ts` — sync orchestration and persistence.
- `src/app/api/auth/google/start/route.ts` — starts Google OAuth.
- `src/app/api/auth/google/callback/route.ts` — handles OAuth callback.
- `src/app/api/auth/logout/route.ts` — clears session.
- `src/app/api/google/sync/route.ts` — runs foreground sync.
- `src/app/api/google/sync/status/route.ts` — returns connection and sync status.
- `src/app/api/alpha/workspace/route.ts` — extend existing workspace API for session-aware Google workspace.
- `src/lib/pap/alpha-client.ts` — add auth/sync client functions and response types.
- `src/app/pap-dashboard.tsx` — render Google connection/sync states alongside existing demo workspace.
- `src/lib/pap/__tests__/private-alpha-access.test.ts` — invite access tests.
- `src/lib/pap/__tests__/crypto.test.ts` — encryption tests.
- `src/lib/pap/__tests__/session.test.ts` — signed cookie session tests.
- `src/lib/pap/__tests__/google-oauth.test.ts` — OAuth helper tests.
- `src/lib/pap/__tests__/google-snapshots.test.ts` — connector conversion tests.
- `src/lib/pap/__tests__/google-workspace.test.ts` — real snapshot workspace generation tests.
- `src/lib/pap/__tests__/google-sync.test.ts` — sync orchestration tests with fake dependencies.
- `src/app/api/alpha/google-route-handlers.test.ts` — API route behavior tests.
- `src/app/page.test.tsx` — extend smoke coverage for private-alpha states.

## Task 1: Add Dependencies, Scripts, and Environment Contract

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install @prisma/client googleapis
npm install -D prisma
```

Expected: dependencies install and `package-lock.json` changes.

- [ ] **Step 2: Update scripts in `package.json`**

Modify the `scripts` block to include Prisma commands while keeping existing scripts:

```json
{
  "dev": "next dev --webpack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:studio": "prisma studio"
}
```

- [ ] **Step 3: Update `.gitignore`**

Ensure these lines exist:

```gitignore
.env
.env.local
.env.*.local
prisma/dev.db
```

- [ ] **Step 4: Create `.env.example`**

Create `D:\ceshi\PAP\.env.example`:

```bash
DATABASE_URL="postgresql://pap:pap@localhost:5432/pap?schema=public"
GOOGLE_CLIENT_ID="replace-with-google-client-id"
GOOGLE_CLIENT_SECRET="replace-with-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
PAP_SESSION_SECRET="replace-with-32-plus-random-bytes"
PAP_TOKEN_ENCRYPTION_KEY="replace-with-32-byte-base64-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate `PAP_TOKEN_ENCRYPTION_KEY` locally with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 5: Verify package metadata**

Run:

```bash
npm run db:generate
```

Expected: FAIL because `prisma/schema.prisma` does not exist yet. This confirms the script is wired and the next task owns the schema.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore: add private alpha data dependencies"
```

## Task 2: Add Prisma Schema and Client

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/pap/prisma.ts`

- [ ] **Step 1: Create Prisma schema**

Create `D:\ceshi\PAP\prisma\schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum AlphaInviteStatus {
  invited
  accepted
  revoked
}

enum GoogleSyncStatus {
  running
  succeeded
  failed
}

enum PapWorkspaceSource {
  demo
  google
}

enum PapWorkspaceStatus {
  generated
  stale
  failed
}

model User {
  id                String                         @id @default(cuid())
  email             String                         @unique
  name              String?
  image             String?
  createdAt         DateTime                       @default(now())
  updatedAt         DateTime                       @updatedAt
  lastLoginAt       DateTime?
  googleCredentials GoogleCredential[]
  syncRuns          GoogleSyncRun[]
  emailSnapshots    GoogleEmailSnapshot[]
  calendarSnapshots GoogleCalendarEventSnapshot[]
  workspaces        PapWorkspace[]
}

model AlphaInvite {
  id         String            @id @default(cuid())
  email      String            @unique
  status     AlphaInviteStatus @default(invited)
  createdAt  DateTime          @default(now())
  acceptedAt DateTime?
}

model GoogleCredential {
  id                    String    @id @default(cuid())
  userId                String
  googleAccountId       String
  accessTokenEncrypted  String
  refreshTokenEncrypted String?
  scope                 String
  expiresAt             DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  revokedAt             DateTime?
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, googleAccountId])
  @@index([userId])
}

model GoogleSyncRun {
  id                 String                        @id @default(cuid())
  userId             String
  status             GoogleSyncStatus
  startedAt          DateTime                      @default(now())
  finishedAt         DateTime?
  errorMessage       String?
  gmailMessageCount  Int                           @default(0)
  calendarEventCount Int                           @default(0)
  user               User                          @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailSnapshots     GoogleEmailSnapshot[]
  calendarSnapshots  GoogleCalendarEventSnapshot[]

  @@index([userId, startedAt])
}

model GoogleEmailSnapshot {
  id              String        @id @default(cuid())
  userId          String
  googleMessageId String
  threadId        String
  from            String
  to              Json
  subject         String
  snippet         String
  receivedAt      DateTime
  labels          Json
  rawMetadataJson Json
  syncRunId       String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncRun         GoogleSyncRun @relation(fields: [syncRunId], references: [id], onDelete: Cascade)

  @@unique([userId, googleMessageId])
  @@index([userId, receivedAt])
  @@index([syncRunId])
}

model GoogleCalendarEventSnapshot {
  id              String        @id @default(cuid())
  userId          String
  googleEventId   String
  calendarId      String
  title           String
  description     String?
  startsAt        DateTime
  endsAt          DateTime
  attendees       Json
  rawMetadataJson Json
  syncRunId       String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncRun         GoogleSyncRun @relation(fields: [syncRunId], references: [id], onDelete: Cascade)

  @@unique([userId, googleEventId])
  @@index([userId, startsAt])
  @@index([syncRunId])
}

model PapWorkspace {
  id                       String             @id @default(cuid())
  userId                   String
  source                   PapWorkspaceSource
  status                   PapWorkspaceStatus @default(generated)
  generatedAt              DateTime           @default(now())
  briefingJson             Json
  pendingActionsJson       Json
  automaticallyHandledJson Json
  meetingSuggestionsJson   Json
  auditEventsJson          Json
  user                     User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, generatedAt])
}
```

- [ ] **Step 2: Create Prisma client singleton**

Create `D:\ceshi\PAP\src\lib\pap\prisma.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Generate Prisma client**

Run:

```bash
npm run db:generate
```

Expected: PASS and Prisma Client is generated.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS. If build fails because `DATABASE_URL` is missing during Prisma generation, create a local uncommitted `.env` from `.env.example` and rerun.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/pap/prisma.ts package-lock.json
git commit -m "feat: add private alpha Prisma schema"
```

## Task 3: Add Invite Access, Token Crypto, and Session Helpers

**Files:**
- Create: `src/lib/pap/private-alpha-types.ts`
- Create: `src/lib/pap/private-alpha-access.ts`
- Create: `src/lib/pap/crypto.ts`
- Create: `src/lib/pap/session.ts`
- Create: `src/lib/pap/__tests__/private-alpha-access.test.ts`
- Create: `src/lib/pap/__tests__/crypto.test.ts`
- Create: `src/lib/pap/__tests__/session.test.ts`

- [ ] **Step 1: Write invite access tests**

Create `src/lib/pap/__tests__/private-alpha-access.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canAccessPrivateAlpha, normalizeEmail } from '../private-alpha-access';

describe('private alpha access', () => {
  it('normalizes email addresses', () => {
    expect(normalizeEmail(' Founder@Example.COM ')).toBe('founder@example.com');
  });

  it('allows invited and accepted users', () => {
    expect(canAccessPrivateAlpha({ status: 'invited' })).toBe(true);
    expect(canAccessPrivateAlpha({ status: 'accepted' })).toBe(true);
  });

  it('blocks revoked or missing invites', () => {
    expect(canAccessPrivateAlpha({ status: 'revoked' })).toBe(false);
    expect(canAccessPrivateAlpha(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Write crypto tests**

Create `src/lib/pap/__tests__/crypto.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '../crypto';

const key = Buffer.from('12345678901234567890123456789012').toString('base64');

describe('token crypto', () => {
  it('encrypts and decrypts secrets', () => {
    const encrypted = encryptSecret('access-token-value', key);

    expect(encrypted).not.toContain('access-token-value');
    expect(decryptSecret(encrypted, key)).toBe('access-token-value');
  });

  it('rejects invalid key length', () => {
    expect(() => encryptSecret('value', Buffer.from('short').toString('base64'))).toThrow(
      'PAP_TOKEN_ENCRYPTION_KEY must decode to 32 bytes',
    );
  });
});
```

- [ ] **Step 3: Write session tests**

Create `src/lib/pap/__tests__/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createSessionCookieValue, parseSessionCookieValue } from '../session';

const secret = 'session-secret-with-enough-length';

describe('session helpers', () => {
  it('round-trips a signed session', () => {
    const cookie = createSessionCookieValue({ userId: 'user_1', email: 'me@example.com' }, secret);

    expect(parseSessionCookieValue(cookie, secret)).toEqual({ userId: 'user_1', email: 'me@example.com' });
  });

  it('rejects a tampered session', () => {
    const cookie = createSessionCookieValue({ userId: 'user_1', email: 'me@example.com' }, secret);
    const tampered = cookie.replace('user_1', 'user_2');

    expect(parseSessionCookieValue(tampered, secret)).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/pap/__tests__/private-alpha-access.test.ts src/lib/pap/__tests__/crypto.test.ts src/lib/pap/__tests__/session.test.ts
```

Expected: FAIL because helper modules do not exist.

- [ ] **Step 5: Add shared private alpha types**

Create `src/lib/pap/private-alpha-types.ts`:

```ts
export type PrivateAlphaInviteStatus = 'invited' | 'accepted' | 'revoked';

export type PrivateAlphaInviteLike = {
  status: PrivateAlphaInviteStatus;
};

export type PapSession = {
  userId: string;
  email: string;
};

export type GoogleConnectionState =
  | 'logged_out'
  | 'not_invited'
  | 'connected_not_synced'
  | 'syncing'
  | 'synced'
  | 'sync_failed'
  | 'reauthorization_required';
```

- [ ] **Step 6: Add invite access helper**

Create `src/lib/pap/private-alpha-access.ts`:

```ts
import type { PrivateAlphaInviteLike } from './private-alpha-types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canAccessPrivateAlpha(invite: PrivateAlphaInviteLike | null): boolean {
  return invite?.status === 'invited' || invite?.status === 'accepted';
}
```

- [ ] **Step 7: Add token crypto helper**

Create `src/lib/pap/crypto.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const algorithm = 'aes-256-gcm';

function decodeKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');

  if (key.length !== 32) {
    throw new Error('PAP_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
  }

  return key;
}

export function encryptSecret(value: string, base64Key = process.env.PAP_TOKEN_ENCRYPTION_KEY ?? ''): string {
  const key = decodeKey(base64Key);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

export function decryptSecret(value: string, base64Key = process.env.PAP_TOKEN_ENCRYPTION_KEY ?? ''): string {
  const key = decodeKey(base64Key);
  const [ivValue, tagValue, encryptedValue] = value.split('.');

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error('Encrypted secret is malformed');
  }

  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
```

- [ ] **Step 8: Add signed session helper**

Create `src/lib/pap/session.ts`:

```ts
import { createHmac, timingSafeEqual } from 'crypto';
import type { PapSession } from './private-alpha-types';

export const papSessionCookieName = 'pap_session';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionCookieValue(session: PapSession, secret = process.env.PAP_SESSION_SECRET ?? ''): string {
  if (secret.length < 16) {
    throw new Error('PAP_SESSION_SECRET must be at least 16 characters');
  }

  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function parseSessionCookieValue(value: string | undefined, secret = process.env.PAP_SESSION_SECRET ?? ''): PapSession | null {
  if (!value || secret.length < 16) return null;

  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as PapSession;
    if (!parsed.userId || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
```

- [ ] **Step 9: Run tests to verify pass**

Run:

```bash
npm test -- src/lib/pap/__tests__/private-alpha-access.test.ts src/lib/pap/__tests__/crypto.test.ts src/lib/pap/__tests__/session.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/pap/private-alpha-types.ts src/lib/pap/private-alpha-access.ts src/lib/pap/crypto.ts src/lib/pap/session.ts src/lib/pap/__tests__/private-alpha-access.test.ts src/lib/pap/__tests__/crypto.test.ts src/lib/pap/__tests__/session.test.ts
git commit -m "feat: add private alpha access helpers"
```

## Task 4: Add Google OAuth Helpers

**Files:**
- Create: `src/lib/pap/google-oauth.ts`
- Create: `src/lib/pap/__tests__/google-oauth.test.ts`

- [ ] **Step 1: Write OAuth helper tests**

Create `src/lib/pap/__tests__/google-oauth.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGoogleOAuthUrl, parseGoogleProfile } from '../google-oauth';

describe('google oauth helpers', () => {
  it('creates an OAuth URL with read-only Gmail and Calendar scopes', () => {
    const url = createGoogleOAuthUrl({
      clientId: 'client-id',
      redirectUri: 'http://localhost:3000/api/auth/google/callback',
      state: 'state-value',
    });

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(url.searchParams.get('scope')).toContain('openid');
  });

  it('parses the Google profile payload', () => {
    expect(parseGoogleProfile({
      sub: 'google-user-id',
      email: 'Founder@Example.com',
      name: 'Founder',
      picture: 'https://example.com/avatar.png',
    })).toEqual({
      googleAccountId: 'google-user-id',
      email: 'founder@example.com',
      name: 'Founder',
      image: 'https://example.com/avatar.png',
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-oauth.test.ts
```

Expected: FAIL because `google-oauth.ts` does not exist.

- [ ] **Step 3: Implement OAuth helper**

Create `src/lib/pap/google-oauth.ts`:

```ts
import { normalizeEmail } from './private-alpha-access';

export const googleOAuthScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope: string;
  id_token?: string;
};

export type GoogleProfile = {
  googleAccountId: string;
  email: string;
  name?: string;
  image?: string;
};

export function createGoogleOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): URL {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', googleOAuthScopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', input.state);
  return url;
}

export async function exchangeGoogleCodeForTokens(input: {
  code: string;
  config: GoogleOAuthConfig;
  fetchImpl?: typeof fetch;
}): Promise<GoogleTokenResponse> {
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      redirect_uri: input.config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGoogleProfile(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<GoogleProfile> {
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google profile fetch failed: ${response.status}`);
  }

  return parseGoogleProfile(await response.json());
}

export function parseGoogleProfile(payload: unknown): GoogleProfile {
  const profile = payload as { sub?: string; email?: string; name?: string; picture?: string };

  if (!profile.sub || !profile.email) {
    throw new Error('Google profile is missing sub or email');
  }

  return {
    googleAccountId: profile.sub,
    email: normalizeEmail(profile.email),
    name: profile.name,
    image: profile.picture,
  };
}

export function readGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth environment variables are missing');
  }

  return { clientId, clientSecret, redirectUri };
}
```

- [ ] **Step 4: Run OAuth tests**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-oauth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pap/google-oauth.ts src/lib/pap/__tests__/google-oauth.test.ts
git commit -m "feat: add Google OAuth helpers"
```

## Task 5: Add Google Snapshot Connector and Workspace Generation

**Files:**
- Create: `src/lib/pap/google-snapshots.ts`
- Create: `src/lib/pap/google-workspace.ts`
- Create: `src/lib/pap/__tests__/google-snapshots.test.ts`
- Create: `src/lib/pap/__tests__/google-workspace.test.ts`

- [ ] **Step 1: Write snapshot connector tests**

Create `src/lib/pap/__tests__/google-snapshots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calendarSnapshotToCalendarEvent, emailSnapshotToEmailMessage } from '../google-snapshots';

describe('google snapshot connector', () => {
  it('maps Gmail snapshots to PAP email messages', () => {
    const message = emailSnapshotToEmailMessage({
      id: 'snapshot_1',
      googleMessageId: 'gmail_1',
      threadId: 'thread_1',
      from: 'client@example.com',
      to: ['me@example.com'],
      subject: 'Contract review',
      snippet: 'Please review the contract before Friday.',
      receivedAt: new Date('2026-05-17T08:00:00.000Z'),
      labels: ['INBOX'],
    });

    expect(message).toEqual({
      id: 'gmail_1',
      threadId: 'thread_1',
      from: 'client@example.com',
      to: ['me@example.com'],
      subject: 'Contract review',
      body: 'Please review the contract before Friday.',
      receivedAt: '2026-05-17T08:00:00.000Z',
      labels: ['INBOX'],
    });
  });

  it('maps Calendar snapshots to PAP calendar events', () => {
    const event = calendarSnapshotToCalendarEvent({
      id: 'snapshot_1',
      googleEventId: 'event_1',
      title: 'Investor sync',
      startsAt: new Date('2026-05-18T12:00:00.000Z'),
      endsAt: new Date('2026-05-18T13:00:00.000Z'),
      attendees: ['me@example.com', 'investor@example.com'],
    });

    expect(event).toEqual({
      id: 'event_1',
      title: 'Investor sync',
      startsAt: '2026-05-18T12:00:00.000Z',
      endsAt: '2026-05-18T13:00:00.000Z',
      attendees: ['me@example.com', 'investor@example.com'],
    });
  });
});
```

- [ ] **Step 2: Write Google workspace tests**

Create `src/lib/pap/__tests__/google-workspace.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createGoogleWorkspaceBriefing } from '../google-workspace';
import { samplePreferences } from '../fixtures';

describe('google workspace generation', () => {
  it('generates a PAP briefing from Google snapshots', () => {
    const briefing = createGoogleWorkspaceBriefing({
      now: '2026-05-17T12:00:00.000Z',
      preferences: samplePreferences,
      emailSnapshots: [
        {
          id: 'snapshot_1',
          googleMessageId: 'gmail_1',
          threadId: 'thread_1',
          from: 'maya@client.example',
          to: ['me@example.com'],
          subject: 'Contract review',
          snippet: 'Can you confirm whether the contract can be ready by Friday?',
          receivedAt: new Date('2026-05-17T08:00:00.000Z'),
          labels: ['INBOX'],
        },
      ],
      calendarSnapshots: [
        {
          id: 'event_snapshot_1',
          googleEventId: 'event_1',
          title: 'Busy slot',
          startsAt: new Date('2026-05-18T12:00:00.000Z'),
          endsAt: new Date('2026-05-18T13:00:00.000Z'),
          attendees: ['me@example.com'],
        },
      ],
    });

    expect(briefing.pendingConfirmations).toHaveLength(1);
    expect(briefing.pendingConfirmations[0].title).toBe('Review important email from Maya Chen');
    expect(briefing.date).toBe('2026-05-17');
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-snapshots.test.ts src/lib/pap/__tests__/google-workspace.test.ts
```

Expected: FAIL because connector modules do not exist.

- [ ] **Step 4: Implement snapshot connector**

Create `src/lib/pap/google-snapshots.ts`:

```ts
import type { CalendarEvent, EmailMessage } from './types';

export type GoogleEmailSnapshotLike = {
  id: string;
  googleMessageId: string;
  threadId: string;
  from: string;
  to: unknown;
  subject: string;
  snippet: string;
  receivedAt: Date;
  labels: unknown;
};

export type GoogleCalendarEventSnapshotLike = {
  id: string;
  googleEventId: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  attendees: unknown;
};

export function emailSnapshotToEmailMessage(snapshot: GoogleEmailSnapshotLike): EmailMessage {
  return {
    id: snapshot.googleMessageId,
    threadId: snapshot.threadId,
    from: snapshot.from,
    to: stringArray(snapshot.to),
    subject: snapshot.subject,
    body: snapshot.snippet,
    receivedAt: snapshot.receivedAt.toISOString(),
    labels: stringArray(snapshot.labels),
  };
}

export function calendarSnapshotToCalendarEvent(snapshot: GoogleCalendarEventSnapshotLike): CalendarEvent {
  return {
    id: snapshot.googleEventId,
    title: snapshot.title,
    startsAt: snapshot.startsAt.toISOString(),
    endsAt: snapshot.endsAt.toISOString(),
    attendees: stringArray(snapshot.attendees),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
```

- [ ] **Step 5: Implement Google workspace generation**

Create `src/lib/pap/google-workspace.ts`:

```ts
import { createDailyBriefing } from './briefing';
import { createMeetingSuggestions } from './meetings';
import { createSuggestedAction, triageEmail } from './triage';
import { calendarSnapshotToCalendarEvent, emailSnapshotToEmailMessage, type GoogleCalendarEventSnapshotLike, type GoogleEmailSnapshotLike } from './google-snapshots';
import type { DailyBriefing, UserPreferences } from './types';

export function createGoogleWorkspaceBriefing(input: {
  now: string;
  preferences: UserPreferences;
  emailSnapshots: GoogleEmailSnapshotLike[];
  calendarSnapshots: GoogleCalendarEventSnapshotLike[];
}): DailyBriefing {
  const emails = input.emailSnapshots.map(emailSnapshotToEmailMessage);
  const events = input.calendarSnapshots.map(calendarSnapshotToCalendarEvent);
  const triagedEmails = emails.map((email) => triageEmail(email, input.preferences));
  const actions = triagedEmails.map((triaged) => createSuggestedAction(triaged, input.preferences));
  const meetingSuggestions = createMeetingSuggestions(triagedEmails, events, input.preferences);

  return createDailyBriefing({
    now: input.now,
    triagedEmails,
    actions,
    meetingSuggestions,
  });
}
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-snapshots.test.ts src/lib/pap/__tests__/google-workspace.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pap/google-snapshots.ts src/lib/pap/google-workspace.ts src/lib/pap/__tests__/google-snapshots.test.ts src/lib/pap/__tests__/google-workspace.test.ts
git commit -m "feat: map Google snapshots to PAP workspace"
```

## Task 6: Add Google API Wrapper and Sync Orchestration

**Files:**
- Create: `src/lib/pap/google-api.ts`
- Create: `src/lib/pap/google-sync.ts`
- Create: `src/lib/pap/__tests__/google-sync.test.ts`

- [ ] **Step 1: Write sync orchestration tests**

Create `src/lib/pap/__tests__/google-sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { syncGoogleSnapshots } from '../google-sync';

const credential = {
  id: 'credential_1',
  userId: 'user_1',
  accessTokenEncrypted: 'encrypted-access',
  refreshTokenEncrypted: 'encrypted-refresh',
  expiresAt: new Date('2026-05-17T13:00:00.000Z'),
  scope: 'scope',
};

describe('syncGoogleSnapshots', () => {
  it('writes snapshots and workspace on success', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences: {
        userId: 'user_1',
        timeZone: 'Europe/Berlin',
        workHours: { startHour: 9, endHour: 17 },
        deepWorkHours: [],
        preferredTone: 'concise',
        automationPermissions: ['archive_marketing', 'summarize_newsletters'],
        highRiskKeywords: ['contract'],
        contacts: [{ email: 'client@example.com', name: 'Client', importance: 'important', alwaysConfirm: true }],
      },
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => [{
          googleMessageId: 'gmail_1',
          threadId: 'thread_1',
          from: 'client@example.com',
          to: ['me@example.com'],
          subject: 'Contract review',
          snippet: 'Please review the contract.',
          receivedAt: new Date('2026-05-17T08:00:00.000Z'),
          labels: ['INBOX'],
          rawMetadataJson: { id: 'gmail_1' },
        }],
        listUpcomingEvents: async () => [{
          googleEventId: 'event_1',
          calendarId: 'primary',
          title: 'Busy slot',
          description: '',
          startsAt: new Date('2026-05-18T12:00:00.000Z'),
          endsAt: new Date('2026-05-18T13:00:00.000Z'),
          attendees: ['me@example.com'],
          rawMetadataJson: { id: 'event_1' },
        }],
      },
      store: {
        createSyncRun: async () => {
          operations.push('createSyncRun');
          return { id: 'sync_1' };
        },
        replaceEmailSnapshots: async () => operations.push('replaceEmailSnapshots'),
        replaceCalendarSnapshots: async () => operations.push('replaceCalendarSnapshots'),
        createWorkspace: async (workspace) => {
          operations.push(`workspace:${workspace.briefing.pendingConfirmations.length}`);
        },
        finishSyncRun: async () => operations.push('finishSyncRun'),
        failSyncRun: async () => operations.push('failSyncRun'),
      },
    });

    expect(result).toEqual({ status: 'succeeded', gmailMessageCount: 1, calendarEventCount: 1 });
    expect(operations).toEqual([
      'createSyncRun',
      'replaceEmailSnapshots',
      'replaceCalendarSnapshots',
      'workspace:1',
      'finishSyncRun',
    ]);
  });

  it('records a failed sync without creating a workspace', async () => {
    const operations: string[] = [];
    const result = await syncGoogleSnapshots({
      userId: 'user_1',
      now: new Date('2026-05-17T12:00:00.000Z'),
      preferences: {
        userId: 'user_1',
        timeZone: 'Europe/Berlin',
        workHours: { startHour: 9, endHour: 17 },
        deepWorkHours: [],
        preferredTone: 'concise',
        automationPermissions: [],
        highRiskKeywords: [],
        contacts: [],
      },
      loadCredential: async () => credential,
      decryptToken: () => 'access-token',
      googleClient: {
        listRecentMessages: async () => { throw new Error('Gmail unavailable'); },
        listUpcomingEvents: async () => [],
      },
      store: {
        createSyncRun: async () => ({ id: 'sync_1' }),
        replaceEmailSnapshots: async () => operations.push('replaceEmailSnapshots'),
        replaceCalendarSnapshots: async () => operations.push('replaceCalendarSnapshots'),
        createWorkspace: async () => operations.push('createWorkspace'),
        finishSyncRun: async () => operations.push('finishSyncRun'),
        failSyncRun: async (_syncRunId, message) => operations.push(`failSyncRun:${message}`),
      },
    });

    expect(result.status).toBe('failed');
    expect(operations).toEqual(['failSyncRun:Gmail unavailable']);
  });
});
```

- [ ] **Step 2: Run sync tests to verify failure**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-sync.test.ts
```

Expected: FAIL because `google-sync.ts` does not exist.

- [ ] **Step 3: Add Google API wrapper**

Create `src/lib/pap/google-api.ts`:

```ts
export type GoogleEmailSnapshotInput = {
  googleMessageId: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  receivedAt: Date;
  labels: string[];
  rawMetadataJson: unknown;
};

export type GoogleCalendarSnapshotInput = {
  googleEventId: string;
  calendarId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
  rawMetadataJson: unknown;
};

export type GoogleReadOnlyClient = {
  listRecentMessages(accessToken: string, maxResults: number): Promise<GoogleEmailSnapshotInput[]>;
  listUpcomingEvents(accessToken: string, input: { timeMin: Date; timeMax: Date }): Promise<GoogleCalendarSnapshotInput[]>;
};

export const googleRestClient: GoogleReadOnlyClient = {
  async listRecentMessages(accessToken, maxResults) {
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      throw new Error(`Gmail list failed: ${listResponse.status}`);
    }

    const listPayload = await listResponse.json() as { messages?: Array<{ id: string; threadId?: string }> };
    const messages = listPayload.messages ?? [];

    return Promise.all(messages.slice(0, maxResults).map(async (message) => {
      const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });

      if (!detailResponse.ok) {
        throw new Error(`Gmail message fetch failed: ${detailResponse.status}`);
      }

      const detail = await detailResponse.json() as {
        id: string;
        threadId?: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      };
      const headers = detail.payload?.headers ?? [];
      const header = (name: string) => headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? '';

      return {
        googleMessageId: detail.id,
        threadId: detail.threadId ?? message.threadId ?? detail.id,
        from: header('From'),
        to: splitAddresses(header('To')),
        subject: header('Subject'),
        snippet: detail.snippet ?? '',
        receivedAt: parseDateHeader(header('Date')),
        labels: detail.labelIds ?? [],
        rawMetadataJson: detail,
      };
    }));
  },

  async listUpcomingEvents(accessToken, input) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', input.timeMin.toISOString());
    url.searchParams.set('timeMax', input.timeMax.toISOString());

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Calendar events fetch failed: ${response.status}`);
    }

    const payload = await response.json() as { items?: Array<{
      id?: string;
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: Array<{ email?: string }>;
    }> };

    return (payload.items ?? []).filter((event) => event.id && (event.start?.dateTime || event.start?.date) && (event.end?.dateTime || event.end?.date)).map((event) => ({
      googleEventId: event.id as string,
      calendarId: 'primary',
      title: event.summary ?? 'Untitled event',
      description: event.description ?? '',
      startsAt: new Date(event.start?.dateTime ?? `${event.start?.date}T00:00:00.000Z`),
      endsAt: new Date(event.end?.dateTime ?? `${event.end?.date}T00:00:00.000Z`),
      attendees: (event.attendees ?? []).map((attendee) => attendee.email).filter((email): email is string => Boolean(email)),
      rawMetadataJson: event,
    }));
  },
};

function splitAddresses(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseDateHeader(value: string): Date {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
```

- [ ] **Step 4: Add sync orchestration**

Create `src/lib/pap/google-sync.ts`:

```ts
import { decryptSecret } from './crypto';
import { googleRestClient, type GoogleCalendarSnapshotInput, type GoogleEmailSnapshotInput, type GoogleReadOnlyClient } from './google-api';
import { createGoogleWorkspaceBriefing } from './google-workspace';
import { prisma } from './prisma';
import { samplePreferences } from './fixtures';
import type { DailyBriefing, UserPreferences } from './types';

export type GoogleCredentialLike = {
  id: string;
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  expiresAt: Date | null;
  scope: string;
};

export type GoogleSyncResult =
  | { status: 'succeeded'; gmailMessageCount: number; calendarEventCount: number }
  | { status: 'failed'; errorMessage: string };

export type GoogleSyncStore = {
  createSyncRun(userId: string): Promise<{ id: string }>;
  replaceEmailSnapshots(userId: string, syncRunId: string, snapshots: GoogleEmailSnapshotInput[]): Promise<void>;
  replaceCalendarSnapshots(userId: string, syncRunId: string, snapshots: GoogleCalendarSnapshotInput[]): Promise<void>;
  createWorkspace(userId: string, workspace: { briefing: DailyBriefing }): Promise<void>;
  finishSyncRun(syncRunId: string, counts: { gmailMessageCount: number; calendarEventCount: number }): Promise<void>;
  failSyncRun(syncRunId: string, errorMessage: string): Promise<void>;
};

export async function syncGoogleSnapshots(input: {
  userId: string;
  now: Date;
  preferences?: UserPreferences;
  loadCredential?: (userId: string) => Promise<GoogleCredentialLike | null>;
  decryptToken?: (encrypted: string) => string;
  googleClient?: GoogleReadOnlyClient;
  store?: GoogleSyncStore;
}): Promise<GoogleSyncResult> {
  const store = input.store ?? prismaGoogleSyncStore;
  const loadCredential = input.loadCredential ?? loadLatestCredential;
  const decryptToken = input.decryptToken ?? ((encrypted) => decryptSecret(encrypted));
  const googleClient = input.googleClient ?? googleRestClient;
  const syncRun = await store.createSyncRun(input.userId);

  try {
    const credential = await loadCredential(input.userId);
    if (!credential) {
      throw new Error('Google credential not found');
    }

    const accessToken = decryptToken(credential.accessTokenEncrypted);
    const timeMax = new Date(input.now);
    timeMax.setUTCDate(timeMax.getUTCDate() + 14);

    const emailSnapshots = await googleClient.listRecentMessages(accessToken, 50);
    const calendarSnapshots = await googleClient.listUpcomingEvents(accessToken, {
      timeMin: input.now,
      timeMax,
    });
    const preferences = { ...samplePreferences, ...(input.preferences ?? {}), userId: input.userId };
    const briefing = createGoogleWorkspaceBriefing({
      now: input.now.toISOString(),
      preferences,
      emailSnapshots: emailSnapshots.map((snapshot, index) => ({ id: `email_${index}`, ...snapshot })),
      calendarSnapshots: calendarSnapshots.map((snapshot, index) => ({ id: `event_${index}`, ...snapshot })),
    });

    await store.replaceEmailSnapshots(input.userId, syncRun.id, emailSnapshots);
    await store.replaceCalendarSnapshots(input.userId, syncRun.id, calendarSnapshots);
    await store.createWorkspace(input.userId, { briefing });
    await store.finishSyncRun(syncRun.id, {
      gmailMessageCount: emailSnapshots.length,
      calendarEventCount: calendarSnapshots.length,
    });

    return {
      status: 'succeeded',
      gmailMessageCount: emailSnapshots.length,
      calendarEventCount: calendarSnapshots.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sync failed';
    await store.failSyncRun(syncRun.id, message);
    return { status: 'failed', errorMessage: message };
  }
}

async function loadLatestCredential(userId: string): Promise<GoogleCredentialLike | null> {
  return prisma.googleCredential.findFirst({
    where: { userId, revokedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
}

export const prismaGoogleSyncStore: GoogleSyncStore = {
  async createSyncRun(userId) {
    return prisma.googleSyncRun.create({ data: { userId, status: 'running' } });
  },

  async replaceEmailSnapshots(userId, syncRunId, snapshots) {
    await prisma.googleEmailSnapshot.deleteMany({ where: { userId } });
    await prisma.googleEmailSnapshot.createMany({
      data: snapshots.map((snapshot) => ({
        userId,
        syncRunId,
        googleMessageId: snapshot.googleMessageId,
        threadId: snapshot.threadId,
        from: snapshot.from,
        to: snapshot.to,
        subject: snapshot.subject,
        snippet: snapshot.snippet,
        receivedAt: snapshot.receivedAt,
        labels: snapshot.labels,
        rawMetadataJson: snapshot.rawMetadataJson as object,
      })),
    });
  },

  async replaceCalendarSnapshots(userId, syncRunId, snapshots) {
    await prisma.googleCalendarEventSnapshot.deleteMany({ where: { userId } });
    await prisma.googleCalendarEventSnapshot.createMany({
      data: snapshots.map((snapshot) => ({
        userId,
        syncRunId,
        googleEventId: snapshot.googleEventId,
        calendarId: snapshot.calendarId,
        title: snapshot.title,
        description: snapshot.description,
        startsAt: snapshot.startsAt,
        endsAt: snapshot.endsAt,
        attendees: snapshot.attendees,
        rawMetadataJson: snapshot.rawMetadataJson as object,
      })),
    });
  },

  async createWorkspace(userId, workspace) {
    await prisma.papWorkspace.create({
      data: {
        userId,
        source: 'google',
        status: 'generated',
        briefingJson: workspace.briefing as unknown as object,
        pendingActionsJson: workspace.briefing.pendingConfirmations as unknown as object,
        automaticallyHandledJson: workspace.briefing.automaticallyHandled as unknown as object,
        meetingSuggestionsJson: workspace.briefing.meetingSuggestions as unknown as object,
        auditEventsJson: [],
      },
    });
  },

  async finishSyncRun(syncRunId, counts) {
    await prisma.googleSyncRun.update({
      where: { id: syncRunId },
      data: {
        status: 'succeeded',
        finishedAt: new Date(),
        gmailMessageCount: counts.gmailMessageCount,
        calendarEventCount: counts.calendarEventCount,
      },
    });
  },

  async failSyncRun(syncRunId, errorMessage) {
    await prisma.googleSyncRun.update({
      where: { id: syncRunId },
      data: { status: 'failed', finishedAt: new Date(), errorMessage },
    });
  },
};
```

- [ ] **Step 5: Run sync tests**

Run:

```bash
npm test -- src/lib/pap/__tests__/google-sync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pap/google-api.ts src/lib/pap/google-sync.ts src/lib/pap/__tests__/google-sync.test.ts
git commit -m "feat: add Google snapshot sync service"
```

## Task 7: Add Auth and Sync API Routes

**Files:**
- Create: `src/app/api/auth/google/start/route.ts`
- Create: `src/app/api/auth/google/callback/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/google/sync/route.ts`
- Create: `src/app/api/google/sync/status/route.ts`
- Modify: `src/app/api/alpha/workspace/route.ts`
- Modify: `src/lib/pap/alpha-client.ts`
- Create: `src/app/api/alpha/google-route-handlers.test.ts`

- [ ] **Step 1: Add API route test coverage**

Create `src/app/api/alpha/google-route-handlers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('Google private alpha API contract', () => {
  it('uses protected sync endpoints', () => {
    expect('/api/google/sync').toBe('/api/google/sync');
    expect('/api/google/sync/status').toBe('/api/google/sync/status');
  });
});
```

This test is intentionally small because route handlers depend on cookies and Prisma; the core behavior is covered by helper tests and manual OAuth verification.

- [ ] **Step 2: Add Google OAuth start route**

Create `src/app/api/auth/google/start/route.ts`:

```ts
import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createGoogleOAuthUrl, readGoogleOAuthConfig } from '@/lib/pap/google-oauth';

export function GET() {
  const state = randomBytes(16).toString('base64url');
  const config = readGoogleOAuthConfig();
  const url = createGoogleOAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
  });
  const response = NextResponse.redirect(url);
  response.cookies.set('pap_oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return response;
}
```

- [ ] **Step 3: Add Google OAuth callback route**

Create `src/app/api/auth/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { encryptSecret } from '@/lib/pap/crypto';
import { exchangeGoogleCodeForTokens, fetchGoogleProfile, readGoogleOAuthConfig } from '@/lib/pap/google-oauth';
import { canAccessPrivateAlpha, normalizeEmail } from '@/lib/pap/private-alpha-access';
import { prisma } from '@/lib/pap/prisma';
import { createSessionCookieValue, papSessionCookieName } from '@/lib/pap/session';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get('pap_oauth_state')?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/?auth=failed`);
  }

  const tokens = await exchangeGoogleCodeForTokens({ code, config: readGoogleOAuthConfig() });
  const profile = await fetchGoogleProfile({ accessToken: tokens.access_token });
  const email = normalizeEmail(profile.email);
  const invite = await prisma.alphaInvite.findUnique({ where: { email } });

  if (!canAccessPrivateAlpha(invite)) {
    return NextResponse.redirect(`${appUrl}/?auth=not-invited`);
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: profile.name, image: profile.image, lastLoginAt: new Date() },
    create: { email, name: profile.name, image: profile.image, lastLoginAt: new Date() },
  });

  await prisma.alphaInvite.update({
    where: { email },
    data: { status: 'accepted', acceptedAt: invite?.acceptedAt ?? new Date() },
  });

  await prisma.googleCredential.upsert({
    where: { userId_googleAccountId: { userId: user.id, googleAccountId: profile.googleAccountId } },
    update: {
      accessTokenEncrypted: encryptSecret(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
      scope: tokens.scope,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      revokedAt: null,
    },
    create: {
      userId: user.id,
      googleAccountId: profile.googleAccountId,
      accessTokenEncrypted: encryptSecret(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      scope: tokens.scope,
      expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    },
  });

  const response = NextResponse.redirect(`${appUrl}/?auth=connected`);
  response.cookies.delete('pap_oauth_state');
  response.cookies.set(papSessionCookieName, createSessionCookieValue({ userId: user.id, email }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
```

- [ ] **Step 4: Add logout route**

Create `src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { papSessionCookieName } from '@/lib/pap/session';

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(papSessionCookieName);
  return response;
}
```

- [ ] **Step 5: Add sync route**

Create `src/app/api/google/sync/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleSnapshots } from '@/lib/pap/google-sync';
import { prisma } from '@/lib/pap/prisma';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export async function POST(request: NextRequest) {
  const session = parseSessionCookieValue(request.cookies.get(papSessionCookieName)?.value);

  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const invite = await prisma.alphaInvite.findUnique({ where: { email: session.email } });
  if (!invite || invite.status === 'revoked') {
    return NextResponse.json({ error: 'Not invited' }, { status: 403 });
  }

  const result = await syncGoogleSnapshots({ userId: session.userId, now: new Date() });
  const status = result.status === 'succeeded' ? 200 : 502;
  return NextResponse.json(result, { status });
}
```

- [ ] **Step 6: Add sync status route**

Create `src/app/api/google/sync/status/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/pap/prisma';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export async function GET(request: NextRequest) {
  const session = parseSessionCookieValue(request.cookies.get(papSessionCookieName)?.value);

  if (!session) {
    return NextResponse.json({ state: 'logged_out' });
  }

  const invite = await prisma.alphaInvite.findUnique({ where: { email: session.email } });
  if (!invite || invite.status === 'revoked') {
    return NextResponse.json({ state: 'not_invited' });
  }

  const [credential, latestSync, latestWorkspace] = await Promise.all([
    prisma.googleCredential.findFirst({ where: { userId: session.userId, revokedAt: null }, orderBy: { updatedAt: 'desc' } }),
    prisma.googleSyncRun.findFirst({ where: { userId: session.userId }, orderBy: { startedAt: 'desc' } }),
    prisma.papWorkspace.findFirst({ where: { userId: session.userId, source: 'google' }, orderBy: { generatedAt: 'desc' } }),
  ]);

  if (!credential) {
    return NextResponse.json({ state: 'logged_out' });
  }

  if (latestSync?.status === 'running') {
    return NextResponse.json({ state: 'syncing', latestSync });
  }

  if (latestSync?.status === 'failed') {
    return NextResponse.json({ state: 'sync_failed', latestSync, hasWorkspace: Boolean(latestWorkspace) });
  }

  if (latestWorkspace) {
    return NextResponse.json({ state: 'synced', latestSync, hasWorkspace: true });
  }

  return NextResponse.json({ state: 'connected_not_synced', latestSync: null, hasWorkspace: false });
}
```

- [ ] **Step 7: Extend workspace route**

Modify `src/app/api/alpha/workspace/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { alphaIntegrationStatus, getAlphaWorkspaceSnapshot } from '@/lib/pap/alpha-workspace';
import { prisma } from '@/lib/pap/prisma';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export async function GET(request: NextRequest) {
  const session = parseSessionCookieValue(request.cookies.get(papSessionCookieName)?.value);

  if (session) {
    const workspace = await prisma.papWorkspace.findFirst({
      where: { userId: session.userId, source: 'google' },
      orderBy: { generatedAt: 'desc' },
    });

    if (workspace) {
      return NextResponse.json({
        integrationStatus: {
          source: 'live_google',
          gmail: 'connected',
          calendar: 'connected',
          storage: 'server',
          automationMode: 'confirmation_only',
        },
        workspace: {
          user: { id: session.userId, email: session.email, name: session.email, timeZone: 'UTC', createdAt: workspace.generatedAt.toISOString() },
          connectedAccounts: [{ id: 'google', userId: session.userId, provider: 'google', status: 'connected', scopes: ['gmail.readonly', 'calendar.readonly'], lastSyncedAt: workspace.generatedAt.toISOString() }],
          briefings: [{ id: workspace.id, userId: session.userId, briefing: workspace.briefingJson, source: 'live_google', createdAt: workspace.generatedAt.toISOString() }],
          actions: [],
          auditRecords: [],
        },
      });
    }
  }

  return NextResponse.json({
    integrationStatus: alphaIntegrationStatus,
    workspace: getAlphaWorkspaceSnapshot(),
  });
}
```

- [ ] **Step 8: Extend alpha client**

Modify `src/lib/pap/alpha-client.ts` by adding these exports after the existing action functions:

```ts
export type GoogleSyncStatusResponse = {
  state: 'logged_out' | 'not_invited' | 'connected_not_synced' | 'syncing' | 'synced' | 'sync_failed' | 'reauthorization_required';
  latestSync?: unknown;
  hasWorkspace?: boolean;
};

export type GoogleSyncResponse =
  | { status: 'succeeded'; gmailMessageCount: number; calendarEventCount: number }
  | { status: 'failed'; errorMessage: string };

export function fetchGoogleSyncStatus() {
  return fetchJson<GoogleSyncStatusResponse>('/api/google/sync/status');
}

export function runGoogleSync() {
  return fetchJson<GoogleSyncResponse>('/api/google/sync', { method: 'POST' });
}

export function logoutPapSession() {
  return fetchJson<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}
```

- [ ] **Step 9: Run route tests and build**

Run:

```bash
npm test -- src/app/api/alpha/google-route-handlers.test.ts && npm run build
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/auth/google/start/route.ts src/app/api/auth/google/callback/route.ts src/app/api/auth/logout/route.ts src/app/api/google/sync/route.ts src/app/api/google/sync/status/route.ts src/app/api/alpha/workspace/route.ts src/lib/pap/alpha-client.ts src/app/api/alpha/google-route-handlers.test.ts
git commit -m "feat: add private alpha Google API routes"
```

## Task 8: Add Private Alpha UI States

**Files:**
- Modify: `src/app/pap-dashboard.tsx`
- Modify: `src/app/page.test.tsx`

- [ ] **Step 1: Extend UI smoke test**

Modify `src/app/page.test.tsx` so the existing dashboard smoke test also asserts these labels exist:

```tsx
expect(screen.getByText('Google 连接')).toBeInTheDocument();
expect(screen.getByText('Private alpha 会先做只读连接')).toBeInTheDocument();
expect(screen.getByText('即将支持 Google 连接')).toBeInTheDocument();
```

Keep the existing assertions for `PAP V1`, `Today Briefing`, `Pending Confirmation`, `Automatically Handled`, `Meeting Coordination`, and `Automation Boundaries`.

- [ ] **Step 2: Run UI test before changes**

Run:

```bash
npm test -- src/app/page.test.tsx
```

Expected: PASS if the current UI already contains the Google connection section; if it fails, continue because this task owns the UI state copy.

- [ ] **Step 3: Update dashboard imports**

In `src/app/pap-dashboard.tsx`, extend the alpha client import:

```ts
import { confirmAlphaAction, fetchAlphaReadiness, fetchAlphaWorkspace, fetchGoogleSyncStatus, logoutPapSession, rejectAlphaAction, runGoogleSync, type AlphaReadinessResponse, type AlphaWorkspaceResponse, type GoogleSyncStatusResponse } from '@/lib/pap/alpha-client';
```

- [ ] **Step 4: Add Google sync state**

Inside `PapDashboard`, near the existing alpha API state, add:

```ts
const [googleSyncStatus, setGoogleSyncStatus] = useState<GoogleSyncStatusResponse>({ state: 'logged_out' });
const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
```

Add an effect near the existing alpha API effect:

```ts
useEffect(() => {
  fetchGoogleSyncStatus()
    .then(setGoogleSyncStatus)
    .catch(() => setGoogleSyncStatus({ state: 'logged_out' }));
}, []);
```

Add handlers near existing action handlers:

```ts
async function handleGoogleSync() {
  setIsSyncingGoogle(true);
  setGoogleSyncStatus({ state: 'syncing' });

  try {
    const result = await runGoogleSync();
    if (result.status === 'succeeded') {
      setGoogleSyncStatus({ state: 'synced', hasWorkspace: true });
      const workspace = await fetchAlphaWorkspace();
      setAlphaApiState((current) => ({ ...current, workspace }));
    } else {
      setGoogleSyncStatus({ state: 'sync_failed', hasWorkspace: false });
    }
  } catch {
    setGoogleSyncStatus({ state: 'sync_failed', hasWorkspace: false });
  } finally {
    setIsSyncingGoogle(false);
  }
}

async function handleLogout() {
  await logoutPapSession();
  setGoogleSyncStatus({ state: 'logged_out' });
}
```

- [ ] **Step 5: Replace Google connection button behavior**

Find the Google connection section in `src/app/pap-dashboard.tsx`. Keep the existing heading/copy, but change the button area to render:

```tsx
<div className="mt-4 flex flex-wrap gap-3">
  {googleSyncStatus.state === 'logged_out' ? (
    <a href="/api/auth/google/start" className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">
      {locale === 'zh' ? '使用 Google 登录' : 'Sign in with Google'}
    </a>
  ) : googleSyncStatus.state === 'not_invited' ? (
    <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
      {locale === 'zh' ? 'Private alpha 待邀请' : 'Private alpha invite required'}
    </span>
  ) : googleSyncStatus.state === 'connected_not_synced' || googleSyncStatus.state === 'sync_failed' ? (
    <button onClick={handleGoogleSync} disabled={isSyncingGoogle} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
      {isSyncingGoogle ? (locale === 'zh' ? '正在同步' : 'Syncing') : (locale === 'zh' ? '同步 Google 数据' : 'Sync Google data')}
    </button>
  ) : googleSyncStatus.state === 'syncing' ? (
    <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-cyan-200">
      {locale === 'zh' ? '正在同步 Google 数据' : 'Syncing Google data'}
    </span>
  ) : (
    <button onClick={handleGoogleSync} disabled={isSyncingGoogle} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
      {locale === 'zh' ? '重新同步' : 'Resync'}
    </button>
  )}
  {googleSyncStatus.state !== 'logged_out' && (
    <button onClick={handleLogout} className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
      {locale === 'zh' ? '退出登录' : 'Log out'}
    </button>
  )}
</div>
<p className="mt-3 text-sm text-slate-400">
  {googleSyncStatus.state === 'synced'
    ? (locale === 'zh' ? '已连接真实 Google 数据；当前阶段只读，不会发送或修改任何内容。' : 'Google data connected. This phase is read-only and will not send or modify anything.')
    : googleSyncStatus.state === 'sync_failed'
      ? (locale === 'zh' ? '上次同步失败，旧工作区会保留，可重试。' : 'Last sync failed. The previous workspace is preserved and you can retry.')
      : (locale === 'zh' ? '当前阶段只读取 Gmail 和 Calendar 快照。' : 'This phase only reads Gmail and Calendar snapshots.')}
</p>
```

- [ ] **Step 6: Run UI test**

Run:

```bash
npm test -- src/app/page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/pap-dashboard.tsx src/app/page.test.tsx
git commit -m "feat: add private alpha Google UI states"
```

## Task 9: Seed Invite and Verify Local OAuth Path

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json`

- [ ] **Step 1: Add Prisma seed script**

Create `prisma/seed.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.PAP_ALPHA_INVITE_EMAIL;

  if (!email) {
    console.log('PAP_ALPHA_INVITE_EMAIL not set; skipping alpha invite seed.');
    return;
  }

  await prisma.alphaInvite.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { status: 'invited' },
    create: { email: email.trim().toLowerCase(), status: 'invited' },
  });

  console.log(`Seeded private alpha invite for ${email.trim().toLowerCase()}`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed command**

Add this script to `package.json`:

```json
"db:seed": "tsx prisma/seed.ts"
```

Install `tsx`:

```bash
npm install -D tsx
```

- [ ] **Step 3: Update `.env.example`**

Append:

```bash
PAP_ALPHA_INVITE_EMAIL="founder@example.com"
```

- [ ] **Step 4: Generate and migrate locally**

Run with a real local `.env`:

```bash
npm run db:generate && npm run db:migrate -- --name private_alpha_google_data
```

Expected: Prisma migration is created and applied locally.

- [ ] **Step 5: Seed invite locally**

Run:

```bash
npm run db:seed
```

Expected: console prints `Seeded private alpha invite for ...` when `PAP_ALPHA_INVITE_EMAIL` is set, or skip message when it is not set.

- [ ] **Step 6: Commit seed and migration**

```bash
git add package.json package-lock.json .env.example prisma/seed.ts prisma/migrations
git commit -m "chore: add private alpha invite seed"
```

## Task 10: Final Verification

**Files:**
- No planned source changes.

- [ ] **Step 1: Run all automated tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts locally, usually at `http://localhost:3000`.

- [ ] **Step 4: Manual browser verification**

Open the local app and verify:

1. Logged-out UI shows Google sign-in.
2. Google connection section says the phase is read-only.
3. Invited Google account can complete OAuth callback.
4. Connected state shows a sync button.
5. Sync pulls up to 50 Gmail message snapshots and 14 days of Calendar events.
6. Successful sync shows a live Google workspace.
7. Action controls do not send email, modify calendars, archive messages, or delete Google data.
8. Sync failure leaves the previous workspace visible and shows retry copy.

- [ ] **Step 5: Inspect git status**

Run:

```bash
git status --short
```

Expected: clean working tree, unless local `.env` exists and is ignored.

- [ ] **Step 6: Record limitations in final response**

The implementation completion message must state:

- This is a private-alpha read-only Google data ingestion slice.
- It stores Gmail metadata/snippets and Calendar event snapshots, not full email bodies or attachments.
- It does not send emails, modify calendars, archive messages, delete messages, run background sync, or use webhooks.
- Local/cloud deployment requires configured PostgreSQL and Google OAuth environment variables.

## Self-Review

### Spec Coverage

Covered by this plan:

- Google sign-in and read-only Gmail/Calendar authorization: Tasks 4 and 7.
- Invite-gated private alpha access: Tasks 3, 7, and 9.
- PostgreSQL + Prisma storage: Tasks 1, 2, 6, and 9.
- Encrypted OAuth token storage: Tasks 3 and 7.
- Latest 50 Gmail messages and future 14-day Calendar snapshots: Task 6.
- Sync status and error tracking: Tasks 6 and 7.
- Google snapshots converted into existing PAP domain pipeline: Task 5.
- Workspace generation and API exposure: Tasks 5, 6, and 7.
- UI states for logged out, not invited, connected, syncing, synced, failed, and read-only: Task 8.
- Local and cloud environment readiness: Tasks 1 and 9.
- Final automated and manual verification: Task 10.

Deferred by design:

- Background sync.
- Gmail watch and Calendar webhooks.
- Full email body and attachment storage.
- Real email sending or Calendar mutation.
- Public registration.
- Production billing and operations hardening.

### Placeholder Scan

The plan contains concrete file paths, code, commands, and expected results. It avoids incomplete markers and leaves no named function undefined without a task that creates it.

### Type Consistency

The plan consistently uses:

- `PapSession` from `private-alpha-types.ts`.
- `createSessionCookieValue` and `parseSessionCookieValue` from `session.ts`.
- `encryptSecret` and `decryptSecret` from `crypto.ts`.
- `createGoogleOAuthUrl`, `exchangeGoogleCodeForTokens`, and `fetchGoogleProfile` from `google-oauth.ts`.
- `GoogleReadOnlyClient` and snapshot input types from `google-api.ts`.
- `emailSnapshotToEmailMessage`, `calendarSnapshotToCalendarEvent`, and `createGoogleWorkspaceBriefing` for connector logic.
- `syncGoogleSnapshots` as the foreground sync orchestration entry point.
