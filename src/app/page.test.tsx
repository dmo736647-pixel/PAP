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
            { id: 'briefing_2026_05_04:action_email_2', sourceActionId: 'action_email_2' },
            { id: 'briefing_2026_05_04:action_email_3', sourceActionId: 'action_email_3' },
          ],
        },
      }), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({ action: { status: 'confirmed' } }), { status: 200 }));
  });
  it('renders the workbench in Chinese by default and can switch to English', async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(screen.getByText('今日简报')).toBeInTheDocument();
    expect(screen.queryByText('这是一个可演示的本地样例')).not.toBeInTheDocument();
    expect(screen.getByText('低风险事项已自动归档或总结；重要回复和会议安排在下方等待确认。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置演示数据' })).toBeInTheDocument();
    expect(screen.getByText('这些动作等你点头')).toBeInTheDocument();
    expect(screen.getByText('先处理 2 个确认')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去确认' })).toBeInTheDocument();
    expect(screen.getByText('PAP 已替你清掉这些事')).toBeInTheDocument();
    expect(screen.getByText('这些时间可以直接发')).toBeInTheDocument();
    expect(screen.getAllByText('自动化边界')[0]).toBeInTheDocument();
    expect(screen.getAllByText('演示数据')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gmail 未连接')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Calendar 未连接')[0]).toBeInTheDocument();
    expect(screen.getAllByText('浏览器本地保存')[0]).toBeInTheDocument();
    expect(screen.getAllByText('确认后才执行')[0]).toBeInTheDocument();
    expect(screen.getByText('Private alpha 会先做只读连接')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '即将支持 Google 连接' })).toBeDisabled();
    expect(await screen.findByText('Alpha API 已就绪')).toBeInTheDocument();
    expect(screen.getByText('API 待确认 2 个')).toBeInTheDocument();
    expect(screen.getByText('只读优先')).toBeInTheDocument();
    expect(screen.getByText('真实执行未开启')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('Today Briefing')).toBeInTheDocument();
    expect(screen.queryByText('This is a local demo workspace')).not.toBeInTheDocument();
    expect(screen.getByText('These actions need your yes')).toBeInTheDocument();
    expect(screen.getByText('Resolve 2 confirmations first')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review confirmations' })).toBeInTheDocument();
    expect(screen.getByText('PAP cleared these for you')).toBeInTheDocument();
    expect(screen.getByText('These times are ready to send')).toBeInTheDocument();
    expect(screen.getAllByText('Automation Rules')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Demo data')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gmail not connected')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Calendar not connected')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Browser-local storage')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Runs after confirmation')[0]).toBeInTheDocument();
    expect(screen.getByText('Private alpha starts read-only')).toBeInTheDocument();
    expect(screen.getByText('Alpha API ready')).toBeInTheDocument();
  });

  it('shows pending confirmation hierarchy and preserves confirm/reject flows', async () => {
    const user = userEvent.setup();

    render(<Home />);

    const pendingSection = screen.getByText('这些动作等你点头').closest('section');
    const todaySection = screen.getByText('今日简报').closest('section');
    expect(pendingSection).not.toBeNull();
    expect(todaySection).not.toBeNull();
    expect(pendingSection?.compareDocumentPosition(todaySection as HTMLElement)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const pending = within(pendingSection as HTMLElement);
    expect(pending.getByText('高风险')).toBeInTheDocument();
    expect(pending.getByText('回复 Maya：先不承诺周五交付')).toBeInTheDocument();
    expect(pending.getAllByText('PAP 建议怎么做')[0]).toBeInTheDocument();
    expect(pending.getByText('发送一版谨慎回复：先确认范围，不承诺日期。')).toBeInTheDocument();
    expect(pending.getAllByText('点确认会执行')[0]).toBeInTheDocument();
    expect(pending.getAllByText('PAP 准备发送')[0]).toBeInTheDocument();
    expect(pending.getByText(/Hi Maya，我先确认一下合同范围/)).toBeInTheDocument();
    expect(pending.getByText('合同 + 交付时间 = 必须确认。')).toBeInTheDocument();
    expect(pending.getByText('合同永远先问我')).toBeInTheDocument();

    await screen.findByText('Alpha API 已就绪');

    await user.click(pending.getAllByRole('button', { name: '确认执行' })[0]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/alpha/actions/briefing_2026_05_04%3Aaction_email_2/confirm', { method: 'POST' });
    expect(await screen.findByText('Alpha API 已记录')).toBeInTheDocument();
    expect(screen.getByText('PAP 刚刚完成并留痕')).toBeInTheDocument();
    expect(screen.getByText(/待确认列表已更新/)).toBeInTheDocument();
    expect(screen.getByText('本轮已完成 1 个动作 · 已留下 1 条记录')).toBeInTheDocument();
    expect(screen.getByText('已确认')).toBeInTheDocument();
    expect(screen.getAllByText(/已确认：/)[0]).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '不要这样做' })[0]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/alpha/actions/briefing_2026_05_04%3Aaction_email_3/reject', { method: 'POST' });
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
    expect(screen.getAllByText(/已拒绝：/)[0]).toBeInTheDocument();
    expect(within(pendingSection as HTMLElement).getByText('今天的确认已清空')).toBeInTheDocument();
    expect(within(pendingSection as HTMLElement).getByText('发送、承诺和改日历仍会先停在这里。')).toBeInTheDocument();
    expect(screen.getByText('今天的决策已清空')).toBeInTheDocument();
    expect(screen.getAllByText('PAP 会继续监控，新事项会再提醒你。')[0]).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '去确认' })).not.toBeInTheDocument();
  });

  it('edits a pending action and can undo or correct an automatic action', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.click(screen.getAllByRole('button', { name: '先改一下' })[0]);
    const editor = screen.getAllByLabelText('修改建议内容')[0];
    expect((editor as HTMLTextAreaElement).value).toContain('Hi Maya');
    await user.clear(editor);
    await user.type(editor, '请先确认对方是否接受周三下午。');
    await user.click(screen.getAllByRole('button', { name: '保存修改' })[0]);

    expect(screen.getAllByText('请先确认对方是否接受周三下午。')[0]).toBeInTheDocument();
    expect(screen.getByText(/下次确认会使用修改版/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '撤销' })[0]);
    expect(screen.getAllByText(/已撤销：/)[0]).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '这次错了' })[0]);
    expect(screen.getByText('已标记错误')).toBeInTheDocument();
  });

  it('shows meeting time zones, prepared reply, and meeting actions', async () => {
    const user = userEvent.setup();

    render(<Home />);

    const meetingSection = screen.getByText('这些时间可以直接发').closest('section');
    expect(meetingSection).not.toBeNull();
    const meeting = within(meetingSection as HTMLElement);

    expect(meeting.getByText('Europe/Berlin')).toBeInTheDocument();
    expect(meeting.getByText('America/New_York')).toBeInTheDocument();
    expect(meeting.getByText('可直接发送的回复')).toBeInTheDocument();
    expect(meeting.getByText('下周二你那边 9:00 对我来说合适。这个时间方便吗？')).toBeInTheDocument();
    expect(meeting.getByRole('button', { name: '换一批时间' })).toBeInTheDocument();

    await user.click(meeting.getByRole('button', { name: '使用第一个时间' }));
    expect(screen.getByText('已选择会议时间')).toBeInTheDocument();
    expect(screen.getByText(/会议时间已选/)).toBeInTheDocument();
    expect(within(meetingSection as HTMLElement).queryByText('协调会议：下周会议')).not.toBeInTheDocument();
    expect(within(meetingSection as HTMLElement).getByText('会议协调已处理完。')).toBeInTheDocument();
  });

  it('loads persisted action state, edited drafts, and audit history', async () => {
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

    expect(await screen.findByText('已确认')).toBeInTheDocument();
    expect(screen.getByText('已确认：回复 Maya：先不承诺周五交付')).toBeInTheDocument();
    expect(screen.queryByText('发送一版谨慎回复：先确认范围，不承诺日期。')).not.toBeInTheDocument();

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
    expect(screen.getByText('已确认')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重置演示数据' }));

    expect(screen.queryByText('已确认')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认执行' })[0]).toBeInTheDocument();
  });

  it('edits automation permissions and persists the boundary change', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Home />);

    expect(screen.getByText('这些 PAP 可以自动做')).toBeInTheDocument();
    expect(screen.getByText('这些必须先问我')).toBeInTheDocument();
    expect(screen.getByText('这些永远不能做')).toBeInTheDocument();
    expect(screen.getByText('PAP 已替你清掉这些事')).toBeInTheDocument();
    expect(screen.getByText('归档低价值营销邮件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /自动归档营销邮件/ }));

    expect(screen.getByText('边界已更新')).toBeInTheDocument();
    expect(screen.getByText(/以后会按新规则处理/)).toBeInTheDocument();
    const automatedSection = screen.getByText('PAP 已替你清掉这些事').closest('section');
    expect(within(automatedSection as HTMLElement).queryByText('归档低价值营销邮件')).not.toBeInTheDocument();
    expect(screen.getAllByText('归档低价值营销邮件')[0]).toBeInTheDocument();

    unmount();
    render(<Home />);

    expect(await screen.findByText('边界已更新')).toBeInTheDocument();
    const restoredAutomatedSection = screen.getByText('PAP 已替你清掉这些事').closest('section');
    expect(within(restoredAutomatedSection as HTMLElement).queryByText('归档低价值营销邮件')).not.toBeInTheDocument();
    expect(screen.getAllByText('归档低价值营销邮件')[0]).toBeInTheDocument();
  });

  it('adds high-risk keywords and toggles always-confirm contacts', async () => {
    const user = userEvent.setup();

    render(<Home />);

    await user.type(screen.getByLabelText('新关键词'), 'demo');
    await user.click(screen.getByRole('button', { name: '添加关键词' }));
    expect(screen.getByRole('button', { name: '移除 demo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Alex Rivera/ }));
    expect(screen.getAllByText('给 Alex 发 3 个可选会议时间')[0]).toBeInTheDocument();
    expect(screen.getByText('边界已更新')).toBeInTheDocument();
    expect(screen.getAllByText(/Alex Rivera 是否先问我/)[0]).toBeInTheDocument();
  });
});
