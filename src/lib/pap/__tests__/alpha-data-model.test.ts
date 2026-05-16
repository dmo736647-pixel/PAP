import { describe, expect, it } from 'vitest';
import { runPapV1Pipeline } from '../pipeline';
import { createAlphaActionRecords, createAlphaAuditRecord } from '../alpha-data-model';

const userId = 'user_alpha_1';
const briefingId = 'briefing_2026_05_04';
const createdAt = '2026-05-04T12:00:00.000Z';

describe('alpha data model', () => {
  it('creates server-side action records from pending confirmations', () => {
    const briefing = runPapV1Pipeline();

    const records = createAlphaActionRecords({ userId, briefingId, briefing, createdAt });

    expect(records).toHaveLength(briefing.pendingConfirmations.length);
    expect(records[0]).toMatchObject({
      userId,
      briefingId,
      sourceActionId: briefing.pendingConfirmations[0].id,
      status: 'pending',
      title: briefing.pendingConfirmations[0].title,
      updatedAt: createdAt,
    });
  });

  it('creates traceable audit records for alpha actions', () => {
    const record = createAlphaAuditRecord({
      userId,
      actionId: 'briefing_2026_05_04:action_email_2',
      eventType: 'confirmed',
      title: 'Reply to Maya without promising Friday',
      createdAt,
    });

    expect(record).toEqual({
      id: '2026-05-04T12:00:00.000Z:confirmed:briefing_2026_05_04:action_email_2',
      userId,
      actionId: 'briefing_2026_05_04:action_email_2',
      eventType: 'confirmed',
      title: 'Reply to Maya without promising Friday',
      createdAt,
    });
  });
});
