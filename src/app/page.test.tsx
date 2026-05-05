import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import Home from './page';

const storageKey = 'pap:v1:dashboard-state';

describe('PAP dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  it('renders the workbench in Chinese by default and can switch to English', async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(screen.getByText('今日简报')).toBeInTheDocument();
    expect(screen.getByText('这些动作等你点头')).toBeInTheDocument();
    expect(screen.getByText('PAP 已替你清掉这些事')).toBeInTheDocument();
    expect(screen.getByText('这些时间可以直接发')).toBeInTheDocument();
    expect(screen.getAllByText('自动化边界')[0]).toBeInTheDocument();
    expect(screen.getByText('12 分钟前已同步')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('Today Briefing')).toBeInTheDocument();
    expect(screen.getByText('These actions need your yes')).toBeInTheDocument();
    expect(screen.getByText('PAP cleared these for you')).toBeInTheDocument();
    expect(screen.getByText('These times are ready to send')).toBeInTheDocument();
    expect(screen.getAllByText('Automation Rules')[0]).toBeInTheDocument();
  });

  it('shows pending confirmation hierarchy and preserves confirm/reject flows', async () => {
    const user = userEvent.setup();

    render(<Home />);

    expect(screen.getAllByText('高风险')[0]).toBeInTheDocument();
    expect(screen.getAllByText('回复 Maya：先不承诺周五交付')[0]).toBeInTheDocument();
    expect(screen.getAllByText('发送一版谨慎回复：先确认范围，不承诺日期。')[0]).toBeInTheDocument();
    expect(screen.getAllByText('PAP 准备发送')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Hi Maya，我先确认一下合同范围/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('合同 + 交付时间 = 必须确认。')[0]).toBeInTheDocument();
    expect(screen.getAllByText('合同永远先问我')[0]).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '确认执行' })[0]);
    expect(screen.getByText('已确认')).toBeInTheDocument();
    expect(screen.getByText(/已确认：/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '不要这样做' })[0]);
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
    expect(screen.getByText(/已拒绝：/)).toBeInTheDocument();
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

    await user.click(screen.getAllByRole('button', { name: '撤销' })[0]);
    expect(screen.getByText(/已撤销：/)).toBeInTheDocument();

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

  it('edits automation permissions and persists the boundary change', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Home />);

    expect(screen.getByText('PAP 已替你清掉这些事')).toBeInTheDocument();
    expect(screen.getByText('归档低价值营销邮件')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /自动归档营销邮件/ }));

    expect(screen.getByText('边界已更新')).toBeInTheDocument();
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
    expect(screen.getByText(/Alex Rivera 是否先问我/)).toBeInTheDocument();
  });
});
