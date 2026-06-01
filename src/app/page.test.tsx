import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const storageKey = 'pap:v1:dashboard-state';

describe('PAP dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: {
          source: 'demo_data',
          gmail: 'not_connected',
          calendar: 'not_connected',
          storage: 'browser_local',
          automationMode: 'confirmation_only',
        },
        readOnlyFirst: true,
        liveActionsEnabled: false,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        integrationStatus: {
          source: 'demo_data',
          gmail: 'not_connected',
          calendar: 'not_connected',
          storage: 'browser_local',
          automationMode: 'confirmation_only',
        },
        workspace: {
          actions: [
            { id: 'briefing_2026_05_04:action_email_2', sourceActionId: 'action_email_2', status: 'pending' },
            { id: 'briefing_2026_05_04:action_email_3', sourceActionId: 'action_email_3', status: 'pending' },
          ],
          auditRecords: [],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: 'logged_out', hasWorkspace: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: { status: 'confirmed' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        workspace: {
          actions: [
            { id: 'briefing_2026_05_04:action_email_2', sourceActionId: 'action_email_2', status: 'confirmed' },
            { id: 'briefing_2026_05_04:action_email_3', sourceActionId: 'action_email_3', status: 'pending' },
          ],
          auditRecords: [{ eventType: 'confirmed' }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ action: { status: 'rejected' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        workspace: {
          actions: [
            { id: 'briefing_2026_05_04:action_email_2', sourceActionId: 'action_email_2', status: 'confirmed' },
            { id: 'briefing_2026_05_04:action_email_3', sourceActionId: 'action_email_3', status: 'rejected' },
          ],
          auditRecords: [{ eventType: 'confirmed' }, { eventType: 'rejected' }],
        },
      }), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({ action: { status: 'confirmed' } }), { status: 200 }));
  });

  it('renders the overview, pending section, and Google login banner', async () => {
    render(<Home />);

    // Overview card
    expect(screen.getByText(/封邮件，PAP 帮你挡住了/)).toBeInTheDocument();

    // Google login banner (not connected)
    expect(screen.getByText('连接 Google，用真实邮件体验 PAP')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '使用 Google 登录' })).toBeInTheDocument();

    // Pending section
    expect(screen.getByText('这些动作等你点头')).toBeInTheDocument();

    // Meeting section
    expect(screen.getByText('这些时间可以直接发')).toBeInTheDocument();

    // Collapsed sections exist but content is hidden
    expect(screen.getByText(/PAP 已自动处理/)).toBeInTheDocument();
    expect(screen.getByText(/自动化规则和边界/)).toBeInTheDocument();

    // Sidebar
    expect(screen.getByRole('button', { name: '重置演示数据' })).toBeInTheDocument();
  });

  it('can switch to English', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText(/emails, PAP filtered/)).toBeInTheDocument();
    expect(screen.getByText('Connect Google to try PAP with your real email')).toBeInTheDocument();
    expect(screen.getByText('These actions need your yes')).toBeInTheDocument();
    expect(screen.getByText('These times are ready to send')).toBeInTheDocument();
  });

  it('shows pending confirmation hierarchy and preserves confirm/reject flows', async () => {
    const user = userEvent.setup();

    render(<Home />);

    const pendingSection = screen.getByText('这些动作等你点头').closest('section');
    expect(pendingSection).not.toBeNull();

    const pending = within(pendingSection as HTMLElement);
    expect(pending.getByText('高风险')).toBeInTheDocument();
    expect(pending.getByText('回复 Maya：先不承诺周五交付')).toBeInTheDocument();
    expect(pending.getByText(/Hi Maya，我先确认一下合同范围/)).toBeInTheDocument();
    expect(pending.getByText('合同永远先问我')).toBeInTheDocument();

    await user.click(pending.getAllByRole('button', { name: '确认执行' })[0]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/alpha/actions/briefing_2026_05_04%3Aaction_email_2/confirm', { method: 'POST' });
    expect(await screen.findByText('PAP 刚刚完成并留痕')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '不要这样做' })[0]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/alpha/actions/briefing_2026_05_04%3Aaction_email_3/reject', { method: 'POST' });
    expect(await screen.findByText('PAP 刚刚完成并留痕')).toBeInTheDocument();
    expect(within(pendingSection as HTMLElement).getByText('今天的确认已清空')).toBeInTheDocument();
  });

  it('edits a pending action', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getAllByRole('button', { name: '先改一下' })[0]);
    const editor = screen.getAllByLabelText('修改建议内容')[0];
    expect((editor as HTMLTextAreaElement).value).toContain('Hi Maya');
    await user.clear(editor);
    await user.type(editor, '请先确认对方是否接受周三下午。');
    await user.click(screen.getAllByRole('button', { name: '保存修改' })[0]);

    expect(screen.getAllByText('请先确认对方是否接受周三下午。')[0]).toBeInTheDocument();
  });

  it('shows meeting card with real participant info and send action', async () => {
    const user = userEvent.setup();

    render(<Home />);

    const meetingSection = screen.getByText('这些时间可以直接发').closest('section');
    expect(meetingSection).not.toBeNull();
    const meeting = within(meetingSection as HTMLElement);

    expect(meeting.getByText('Europe/Berlin')).toBeInTheDocument();
    expect(meeting.getAllByText('alex@studio.example').length).toBeGreaterThanOrEqual(1);
    expect(meeting.getByText('可直接发送的回复')).toBeInTheDocument();
    expect(meeting.getAllByText(/Alex Rivera/).length).toBeGreaterThanOrEqual(1);
    expect(meeting.getByRole('button', { name: /换一批时间/ })).toBeInTheDocument();

    await user.click(meeting.getByRole('button', { name: '发送回复' }));
    expect(screen.getByText(/回复已发送/)).toBeInTheDocument();
  });

  it('loads persisted action state and edited drafts', async () => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      version: 1,
      preferences: {
        userId: 'user_1',
        timeZone: 'Europe/Berlin',
        workHours: { startHour: 9, endHour: 17 },
        deepWorkHours: [{ startHour: 9, endHour: 11 }],
        preferredTone: 'concise',
        automationPermissions: ['archive_marketing', 'summarize_newsletters'],
        highRiskKeywords: ['contract', 'payment', 'quote', 'legal', 'passport', 'invoice'],
        contacts: [
          { email: 'maya@client.example', name: 'Maya Chen', importance: 'important', alwaysConfirm: true, timeZone: 'Asia/Tokyo' },
          { email: 'alex@studio.example', name: 'Alex Rivera', importance: 'normal', alwaysConfirm: false, timeZone: 'America/New_York' },
        ],
      },
      actionResults: [{ id: 'action_email_2', title: '回复 Maya：先不承诺周五交付', status: 'confirmed' }],
      auditEvents: [{
        id: 'event_1',
        actionId: 'action_email_2',
        actionTitle: '回复 Maya：先不承诺周五交付',
        eventType: 'confirmed',
        createdAt: '2026-05-05T00:00:00.000Z',
      }],
      editedDrafts: { action_email_3: '我改过的会议回复。' },
    }));

    render(<Home />);

    expect(screen.getByText(/已执行：/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: '先改一下' })[0]);
    expect((screen.getAllByLabelText('修改建议内容')[0] as HTMLTextAreaElement).value).toBe('我改过的会议回复。');
  });

  it('falls back to default state when persisted data is invalid', async () => {
    window.localStorage.setItem(storageKey, 'not-json');

    render(<Home />);

    expect((await screen.findAllByText('回复 Maya：先不承诺周五交付'))[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认执行' })[0]).toBeInTheDocument();
  });

  it('resets persisted demo state from the sidebar', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getAllByRole('button', { name: '确认执行' })[0]);
    expect(await screen.findByText('PAP 刚刚完成并留痕')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置演示数据' }));

    expect(screen.queryByText('PAP 刚刚完成并留痕')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认执行' })[0]).toBeInTheDocument();
  });

  it('opens and edits automation boundaries in collapsed section', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Home />);

    // Open the boundaries section
    await user.click(screen.getByText(/自动化规则和边界/));

    expect(screen.getByText('这些 PAP 可以自动做')).toBeInTheDocument();
    expect(screen.getByText('这些必须先问我')).toBeInTheDocument();
    expect(screen.getByText('这些永远不能做')).toBeInTheDocument();
    expect(screen.getByText('归档低价值营销邮件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /自动归档营销邮件/ }));

    expect(screen.getByText(/边界已更新/)).toBeInTheDocument();

    unmount();
    render(<Home />);

    // Re-open after reload
    await user.click(screen.getByText(/自动化规则和边界/));
    expect(screen.getByText('归档低价值营销邮件')).toBeInTheDocument();
  });

  it('adds high-risk keywords in collapsed boundaries section', async () => {
    const user = userEvent.setup();

    render(<Home />);

    // Open boundaries section
    await user.click(screen.getByText(/自动化规则和边界/));

    await user.type(screen.getByLabelText('新关键词'), 'demo');
    await user.click(screen.getByRole('button', { name: '添加关键词' }));
    expect(screen.getByRole('button', { name: '移除 demo' })).toBeInTheDocument();

    // Toggle Alex Rivera contact
    const alexButton = screen.getByRole('button', { name: /Alex Rivera/ });
    await user.click(alexButton);
    expect(screen.getByText(/边界已更新/)).toBeInTheDocument();
  });
});
