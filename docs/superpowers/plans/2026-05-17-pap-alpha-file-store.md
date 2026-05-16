# PAP Alpha File Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist PAP Alpha workspace/action/audit state to a local JSON file so dev-session state survives server restarts without adding database dependencies.

**Architecture:** Add a focused file-backed repository under `src/lib/pap/alpha-file-store.ts` that reads/writes `AlphaWorkspaceSnapshot` JSON. Refactor `alpha-workspace.ts` to use this repository instead of module-only memory while preserving the existing public API used by API routes and tests.

**Tech Stack:** Next.js App Router, TypeScript, Node `fs/promises`, Vitest, existing PAP Alpha model types.

---

## File Structure

- Create `src/lib/pap/alpha-file-store.ts`
  - Owns file path resolution, JSON read/write, reset, and corruption fallback for `AlphaWorkspaceSnapshot`.
  - Uses Node `fs/promises`; this module is server/test only and must not be imported by client components.
- Create `src/lib/pap/__tests__/alpha-file-store.test.ts`
  - Tests persistence, reset, and invalid JSON recovery using a temp file path.
- Modify `src/lib/pap/alpha-workspace.ts`
  - Replace module-only `alphaWorkspaceStore` with file-backed load/save functions.
  - Keep current exports: `alphaIntegrationStatus`, `resetAlphaWorkspaceStore`, `getAlphaWorkspaceSnapshot`, `createAlphaWorkspaceSnapshot`, `createAlphaActionDecision`.
- Modify `src/app/api/alpha/workspace/route.ts`
  - Change route handler to async because workspace reads from disk.
- Modify `src/app/api/alpha/actions/[id]/confirm/route.ts`
  - Await file-backed action decision.
- Modify `src/app/api/alpha/actions/[id]/reject/route.ts`
  - Await file-backed action decision.
- Modify tests that call these APIs:
  - `src/lib/pap/__tests__/alpha-workspace.test.ts`
  - `src/app/api/alpha/route-handlers.test.ts`

---

### Task 1: Add file-backed repository

**Files:**
- Create: `src/lib/pap/alpha-file-store.ts`
- Test: `src/lib/pap/__tests__/alpha-file-store.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/pap/__tests__/alpha-file-store.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAlphaWorkspaceFileStore } from '../alpha-file-store';
import type { AlphaWorkspaceSnapshot } from '../alpha-data-model';

let tempDir: string;
let storePath: string;

const snapshot: AlphaWorkspaceSnapshot = {
  user: {
    id: 'user_alpha_1',
    email: 'founder@example.com',
    name: 'PAP Alpha User',
    timeZone: 'Europe/Berlin',
    createdAt: '2026-05-04T12:00:00.000Z',
  },
  connectedAccounts: [],
  briefings: [],
  actions: [{
    id: 'action_1',
    userId: 'user_alpha_1',
    briefingId: 'briefing_1',
    sourceActionId: 'source_1',
    status: 'pending',
    title: 'Review action',
    updatedAt: '2026-05-04T12:00:00.000Z',
  }],
  auditRecords: [],
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'pap-alpha-store-'));
  storePath = join(tempDir, 'workspace.json');
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('alpha file store', () => {
  it('creates the store file from an initial snapshot when missing', async () => {
    const store = createAlphaWorkspaceFileStore({
      filePath: storePath,
      createInitialSnapshot: () => snapshot,
    });

    await expect(store.load()).resolves.toEqual(snapshot);
    await expect(readFile(storePath, 'utf8')).resolves.toContain('Review action');
  });

  it('saves and reloads workspace changes', async () => {
    const store = createAlphaWorkspaceFileStore({
      filePath: storePath,
      createInitialSnapshot: () => snapshot,
    });
    const updated: AlphaWorkspaceSnapshot = {
      ...snapshot,
      actions: [{ ...snapshot.actions[0], status: 'confirmed' }],
    };

    await store.save(updated);

    await expect(store.load()).resolves.toEqual(updated);
  });

  it('resets the file to a fresh initial snapshot', async () => {
    const store = createAlphaWorkspaceFileStore({
      filePath: storePath,
      createInitialSnapshot: () => snapshot,
    });
    await store.save({ ...snapshot, actions: [] });

    await expect(store.reset()).resolves.toEqual(snapshot);
    await expect(store.load()).resolves.toEqual(snapshot);
  });

  it('recovers from invalid JSON by rewriting the initial snapshot', async () => {
    const store = createAlphaWorkspaceFileStore({
      filePath: storePath,
      createInitialSnapshot: () => snapshot,
    });
    await writeFile(storePath, 'not-json', 'utf8');

    await expect(store.load()).resolves.toEqual(snapshot);
    await expect(readFile(storePath, 'utf8')).resolves.toContain('Review action');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/pap/__tests__/alpha-file-store.test.ts
```

Expected: FAIL with module not found for `../alpha-file-store`.

- [ ] **Step 3: Implement `alpha-file-store.ts`**

Create `src/lib/pap/alpha-file-store.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AlphaWorkspaceSnapshot } from './alpha-data-model';

type AlphaWorkspaceFileStoreOptions = {
  filePath?: string;
  createInitialSnapshot: () => AlphaWorkspaceSnapshot;
};

export type AlphaWorkspaceFileStore = {
  load: () => Promise<AlphaWorkspaceSnapshot>;
  save: (snapshot: AlphaWorkspaceSnapshot) => Promise<AlphaWorkspaceSnapshot>;
  reset: () => Promise<AlphaWorkspaceSnapshot>;
};

export const defaultAlphaWorkspaceFilePath = join(process.cwd(), '.pap-alpha', 'workspace.json');

export function createAlphaWorkspaceFileStore(options: AlphaWorkspaceFileStoreOptions): AlphaWorkspaceFileStore {
  const filePath = options.filePath ?? defaultAlphaWorkspaceFilePath;

  async function writeSnapshot(snapshot: AlphaWorkspaceSnapshot) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    return snapshot;
  }

  async function reset() {
    return writeSnapshot(options.createInitialSnapshot());
  }

  async function load() {
    try {
      return JSON.parse(await readFile(filePath, 'utf8')) as AlphaWorkspaceSnapshot;
    } catch {
      return reset();
    }
  }

  async function save(snapshot: AlphaWorkspaceSnapshot) {
    return writeSnapshot(snapshot);
  }

  return { load, save, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/lib/pap/__tests__/alpha-file-store.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pap/alpha-file-store.ts src/lib/pap/__tests__/alpha-file-store.test.ts
git commit -m "feat: add PAP alpha file store"
```

---

### Task 2: Refactor alpha workspace service to use file store

**Files:**
- Modify: `src/lib/pap/alpha-workspace.ts`
- Test: `src/lib/pap/__tests__/alpha-workspace.test.ts`

- [ ] **Step 1: Update alpha workspace tests for async file-backed API**

Replace `src/lib/pap/__tests__/alpha-workspace.test.ts` with:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import {
  alphaIntegrationStatus,
  createAlphaActionDecision,
  getAlphaWorkspaceSnapshot,
  resetAlphaWorkspaceStore,
} from '../alpha-workspace';

describe('alpha workspace', () => {
  beforeEach(async () => {
    await resetAlphaWorkspaceStore();
  });

  it('creates a private alpha workspace from the demo pipeline', async () => {
    const workspace = await getAlphaWorkspaceSnapshot();

    expect(alphaIntegrationStatus).toMatchObject({
      source: 'demo_data',
      gmail: 'not_connected',
      calendar: 'not_connected',
      storage: 'browser_local',
      automationMode: 'confirmation_only',
    });
    expect(workspace.user.id).toBe('user_alpha_1');
    expect(workspace.connectedAccounts[0]).toMatchObject({
      provider: 'google',
      status: 'not_connected',
      scopes: ['gmail.readonly', 'calendar.readonly'],
    });
    expect(workspace.briefings).toHaveLength(1);
    expect(workspace.actions.length).toBeGreaterThan(0);
    expect(workspace.actions.every((action) => action.status === 'pending')).toBe(true);
  });

  it('persists action decisions and audit records in the file store', async () => {
    const actionId = (await getAlphaWorkspaceSnapshot()).actions[0].id;

    await expect(createAlphaActionDecision({ actionId, decision: 'confirmed' })).resolves.toMatchObject({
      action: { id: actionId, status: 'confirmed' },
      auditRecord: { actionId, eventType: 'confirmed' },
    });

    const workspaceAfterConfirm = await getAlphaWorkspaceSnapshot();
    expect(workspaceAfterConfirm.actions.find((action) => action.id === actionId)?.status).toBe('confirmed');
    expect(workspaceAfterConfirm.auditRecords).toHaveLength(1);

    await expect(createAlphaActionDecision({ actionId, decision: 'rejected' })).resolves.toMatchObject({
      action: { id: actionId, status: 'rejected' },
      auditRecord: { actionId, eventType: 'rejected' },
    });

    const workspaceAfterReject = await getAlphaWorkspaceSnapshot();
    expect(workspaceAfterReject.actions.find((action) => action.id === actionId)?.status).toBe('rejected');
    expect(workspaceAfterReject.auditRecords.map((record) => record.eventType)).toEqual(['confirmed', 'rejected']);
  });

  it('returns null for unknown action decisions', async () => {
    await expect(createAlphaActionDecision({ actionId: 'missing', decision: 'confirmed' })).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/lib/pap/__tests__/alpha-workspace.test.ts
```

Expected: FAIL because `getAlphaWorkspaceSnapshot`, `resetAlphaWorkspaceStore`, and `createAlphaActionDecision` are still synchronous.

- [ ] **Step 3: Refactor `alpha-workspace.ts` to async file store**

Replace module-level memory store code in `src/lib/pap/alpha-workspace.ts` with this complete file:

```ts
import { createAlphaWorkspaceFileStore } from './alpha-file-store';
import { runPapV1Pipeline } from './pipeline';
import {
  createAlphaActionRecords,
  createAlphaAuditRecord,
  type AlphaAuditRecord,
  type AlphaBriefingRecord,
  type AlphaConnectedAccount,
  type AlphaUser,
  type AlphaWorkspaceSnapshot,
} from './alpha-data-model';
import type { PapIntegrationStatus } from './types';

const alphaNow = '2026-05-04T12:00:00.000Z';
const alphaUser: AlphaUser = {
  id: 'user_alpha_1',
  email: 'founder@example.com',
  name: 'PAP Alpha User',
  timeZone: 'Europe/Berlin',
  createdAt: alphaNow,
};

export const alphaIntegrationStatus: PapIntegrationStatus = {
  source: 'demo_data',
  gmail: 'not_connected',
  calendar: 'not_connected',
  storage: 'browser_local',
  automationMode: 'confirmation_only',
};

const connectedAccounts: AlphaConnectedAccount[] = [
  {
    id: 'google_alpha_placeholder',
    userId: alphaUser.id,
    provider: 'google',
    status: 'not_connected',
    scopes: ['gmail.readonly', 'calendar.readonly'],
  },
];

function createInitialAlphaWorkspaceSnapshot(): AlphaWorkspaceSnapshot {
  const briefing = runPapV1Pipeline();
  const briefingRecord: AlphaBriefingRecord = {
    id: 'briefing_2026_05_04',
    userId: alphaUser.id,
    briefing,
    source: alphaIntegrationStatus.source,
    createdAt: alphaNow,
  };

  return {
    user: alphaUser,
    connectedAccounts,
    briefings: [briefingRecord],
    actions: createAlphaActionRecords({
      userId: alphaUser.id,
      briefingId: briefingRecord.id,
      briefing,
      createdAt: alphaNow,
    }),
    auditRecords: [],
  };
}

const alphaWorkspaceStore = createAlphaWorkspaceFileStore({
  createInitialSnapshot: createInitialAlphaWorkspaceSnapshot,
});

export function resetAlphaWorkspaceStore() {
  return alphaWorkspaceStore.reset();
}

export function getAlphaWorkspaceSnapshot() {
  return alphaWorkspaceStore.load();
}

export function createAlphaWorkspaceSnapshot() {
  return getAlphaWorkspaceSnapshot();
}

export async function createAlphaActionDecision(params: {
  actionId: string;
  decision: 'confirmed' | 'rejected';
  createdAt?: string;
}) {
  const workspace = await getAlphaWorkspaceSnapshot();
  const action = workspace.actions.find((candidate) => candidate.id === params.actionId);

  if (!action) return null;

  const createdAt = params.createdAt ?? alphaNow;
  const updatedAction = { ...action, status: params.decision, updatedAt: createdAt };
  const auditRecord: AlphaAuditRecord = createAlphaAuditRecord({
    userId: action.userId,
    actionId: action.id,
    eventType: params.decision,
    title: action.title,
    createdAt,
  });
  const updatedWorkspace: AlphaWorkspaceSnapshot = {
    ...workspace,
    actions: workspace.actions.map((candidate) => (
      candidate.id === params.actionId ? updatedAction : candidate
    )),
    auditRecords: [...workspace.auditRecords, auditRecord],
  };

  await alphaWorkspaceStore.save(updatedWorkspace);

  return { action: updatedAction, auditRecord };
}
```

- [ ] **Step 4: Run alpha workspace test**

Run:

```bash
npm test -- src/lib/pap/__tests__/alpha-workspace.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pap/alpha-workspace.ts src/lib/pap/__tests__/alpha-workspace.test.ts
git commit -m "feat: persist PAP alpha workspace to file"
```

---

### Task 3: Update API routes for async workspace store

**Files:**
- Modify: `src/app/api/alpha/workspace/route.ts`
- Modify: `src/app/api/alpha/actions/[id]/confirm/route.ts`
- Modify: `src/app/api/alpha/actions/[id]/reject/route.ts`
- Test: `src/app/api/alpha/route-handlers.test.ts`

- [ ] **Step 1: Update route handler tests for async store calls**

Replace `src/app/api/alpha/route-handlers.test.ts` with:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { GET as getReadiness } from './readiness/route';
import { GET as getWorkspace } from './workspace/route';
import { POST as confirmAction } from './actions/[id]/confirm/route';
import { POST as rejectAction } from './actions/[id]/reject/route';
import { getAlphaWorkspaceSnapshot, resetAlphaWorkspaceStore } from '@/lib/pap/alpha-workspace';

async function json(response: Response) {
  return response.json() as Promise<unknown>;
}

describe('alpha API route handlers', () => {
  beforeEach(async () => {
    await resetAlphaWorkspaceStore();
  });

  it('returns readiness without enabling live actions', async () => {
    const body = await json(getReadiness()) as {
      status: { source: string; gmail: string; calendar: string };
      readOnlyFirst: boolean;
      liveActionsEnabled: boolean;
    };

    expect(body.status).toMatchObject({
      source: 'demo_data',
      gmail: 'not_connected',
      calendar: 'not_connected',
    });
    expect(body.readOnlyFirst).toBe(true);
    expect(body.liveActionsEnabled).toBe(false);
  });

  it('returns an alpha workspace snapshot', async () => {
    const body = await json(await getWorkspace()) as {
      workspace: { user: { id: string }; actions: unknown[] };
    };

    expect(body.workspace.user.id).toBe('user_alpha_1');
    expect(body.workspace.actions.length).toBeGreaterThan(0);
  });

  it('persists confirmed and rejected actions in the workspace route', async () => {
    const actionId = (await getAlphaWorkspaceSnapshot()).actions[0].id;
    const context = { params: Promise.resolve({ id: encodeURIComponent(actionId) }) };

    const confirmed = await json(await confirmAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };
    let workspaceBody = await json(await getWorkspace()) as {
      workspace: { actions: Array<{ id: string; status: string }>; auditRecords: Array<{ eventType: string }> };
    };

    expect(confirmed.action).toMatchObject({ id: actionId, status: 'confirmed' });
    expect(confirmed.auditRecord.eventType).toBe('confirmed');
    expect(workspaceBody.workspace.actions.find((action) => action.id === actionId)?.status).toBe('confirmed');
    expect(workspaceBody.workspace.auditRecords).toHaveLength(1);

    const rejected = await json(await rejectAction(new Request('http://localhost'), context)) as {
      action: { id: string; status: string };
      auditRecord: { eventType: string };
    };
    workspaceBody = await json(await getWorkspace()) as {
      workspace: { actions: Array<{ id: string; status: string }>; auditRecords: Array<{ eventType: string }> };
    };

    expect(rejected.action).toMatchObject({ id: actionId, status: 'rejected' });
    expect(rejected.auditRecord.eventType).toBe('rejected');
    expect(workspaceBody.workspace.actions.find((action) => action.id === actionId)?.status).toBe('rejected');
    expect(workspaceBody.workspace.auditRecords.map((record) => record.eventType)).toEqual(['confirmed', 'rejected']);
  });

  it('returns 404 for unknown action ids', async () => {
    const response = await confirmAction(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'missing' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Action not found' });
  });
});
```

- [ ] **Step 2: Run route tests to verify they fail**

Run:

```bash
npm test -- src/app/api/alpha/route-handlers.test.ts
```

Expected: FAIL because `getWorkspace()` is still synchronous and route handlers do not await file store calls.

- [ ] **Step 3: Update workspace route**

Replace `src/app/api/alpha/workspace/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { alphaIntegrationStatus, getAlphaWorkspaceSnapshot } from '@/lib/pap/alpha-workspace';

export async function GET() {
  return NextResponse.json({
    integrationStatus: alphaIntegrationStatus,
    workspace: await getAlphaWorkspaceSnapshot(),
  });
}
```

- [ ] **Step 4: Update confirm route**

Replace `src/app/api/alpha/actions/[id]/confirm/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { createAlphaActionDecision } from '@/lib/pap/alpha-workspace';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const decision = await createAlphaActionDecision({ actionId: decodeURIComponent(id), decision: 'confirmed' });

  if (!decision) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  return NextResponse.json(decision);
}
```

- [ ] **Step 5: Update reject route**

Replace `src/app/api/alpha/actions/[id]/reject/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { createAlphaActionDecision } from '@/lib/pap/alpha-workspace';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const decision = await createAlphaActionDecision({ actionId: decodeURIComponent(id), decision: 'rejected' });

  if (!decision) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  return NextResponse.json(decision);
}
```

- [ ] **Step 6: Run route tests**

Run:

```bash
npm test -- src/app/api/alpha/route-handlers.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/alpha/workspace/route.ts src/app/api/alpha/actions/[id]/confirm/route.ts src/app/api/alpha/actions/[id]/reject/route.ts src/app/api/alpha/route-handlers.test.ts
git commit -m "feat: use PAP alpha file store in API routes"
```

---

### Task 4: Update client-facing tests and verification

**Files:**
- Test: `src/app/page.test.tsx`
- Test: full repo
- Build: Next.js build

- [ ] **Step 1: Run page test**

Run:

```bash
npm test -- src/app/page.test.tsx
```

Expected: PASS, 9 tests. The page test mocks `fetch`, so it should not touch the file store.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS. Expected count after this plan: 38 tests if no other tests were added.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. Build output should still list:

```text
/api/alpha/actions/[id]/confirm
/api/alpha/actions/[id]/reject
/api/alpha/readiness
/api/alpha/workspace
```

- [ ] **Step 4: Inspect generated store file**

Run:

```bash
git status --short
```

Expected: Code files may be modified if not committed. `.pap-alpha/workspace.json` may exist locally and should remain untracked unless the repo already tracks `.pap-alpha`.

- [ ] **Step 5: Add `.pap-alpha/` to `.gitignore` if needed**

If `git status --short` shows `?? .pap-alpha/`, modify `.gitignore` to include:

```gitignore
.pap-alpha/
```

Then commit:

```bash
git add .gitignore
git commit -m "chore: ignore PAP alpha local store"
```

- [ ] **Step 6: Final commit if any verification-only code changes remain**

Run:

```bash
git status --short
```

Expected: clean or only intentionally ignored local runtime files.

---

## Self-Review

- Spec coverage: The plan implements a file-backed local repository, refactors alpha workspace from memory to file persistence, updates API routes to async file-backed operations, and verifies page/API/build behavior.
- Placeholder scan: No TBD/TODO/fill-in steps remain. Every code task includes exact file contents or exact commands.
- Type consistency: `AlphaWorkspaceSnapshot`, `AlphaWorkspaceFileStore`, `getAlphaWorkspaceSnapshot`, `resetAlphaWorkspaceStore`, and `createAlphaActionDecision` are consistently named across tasks.
