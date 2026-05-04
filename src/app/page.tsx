import type { ReactNode } from 'react';
import { runPapV1Pipeline } from '@/lib/pap/pipeline';

export default function Home() {
  const briefing = runPapV1Pipeline();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">PAP V1</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Your email and calendar agent
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              PAP turns inbox noise into a briefing, confirmation queue, transparent automations, and meeting suggestions.
            </p>
          </div>
          <div className="rounded-2xl bg-cyan-300 px-5 py-4 text-slate-950">
            <p className="text-sm font-medium">Briefing date</p>
            <p className="text-2xl font-semibold">{briefing.date}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Pending confirmations" value={briefing.pendingConfirmations.length} />
          <MetricCard label="Automatically handled" value={briefing.automaticallyHandled.length} />
          <MetricCard label="Meeting suggestions" value={briefing.meetingSuggestions.length} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Today Briefing" description="The smallest useful view of your day.">
            <ul className="space-y-3">
              {briefing.topPriorities.map((priority) => (
                <li key={priority} className="rounded-2xl bg-slate-800/80 p-4 text-slate-100">
                  {priority}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Automation Boundaries" description="PAP stays useful by being explicit about authority.">
            <div className="space-y-3 text-sm text-slate-300">
              <Boundary label="Auto" text="Archive marketing, summarize newsletters, label receipts." />
              <Boundary label="Confirm" text="Client replies, meeting changes, delivery commitments." />
              <Boundary label="Block" text="Payments, contracts, legal topics, sensitive data." />
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Pending Confirmation" description="Medium and high-risk actions wait for you.">
            <div className="space-y-4">
              {briefing.pendingConfirmations.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </Panel>

          <Panel title="Automatically Handled" description="Transparent automation log.">
            <div className="space-y-4">
              {briefing.automaticallyHandled.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </Panel>
        </section>

        <Panel title="Meeting Coordination" description="PAP proposes slots that avoid conflicts and deep work.">
          <div className="grid gap-4 md:grid-cols-2">
            {briefing.meetingSuggestions.map((suggestion) => (
              <article key={suggestion.emailId} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="font-semibold text-slate-50">{suggestion.title}</h3>
                <div className="mt-4 space-y-3">
                  {suggestion.proposedSlots.map((slot) => (
                    <div key={slot.startsAt} className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
                      <p className="font-medium text-cyan-200">
                        {formatTime(slot.startsAt)} - {formatTime(slot.endsAt)}
                      </p>
                      <p className="mt-1">{slot.rationale}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function MetricCard(props: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{props.label}</p>
      <p className="mt-2 text-4xl font-semibold text-cyan-200">{props.value}</p>
    </div>
  );
}

function Panel(props: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-slate-50">{props.title}</h2>
        <p className="mt-1 text-sm text-slate-400">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}

function Boundary(props: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-slate-800 p-4">
      <span className="mr-2 rounded-full bg-cyan-300 px-2 py-1 text-xs font-semibold text-slate-950">
        {props.label}
      </span>
      {props.text}
    </div>
  );
}

function ActionCard(props: {
  action: {
    title: string;
    summary: string;
    rationale: string;
    riskLevel: string;
    requiresConfirmation: boolean;
  };
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-50">{props.action.title}</h3>
          <p className="mt-2 text-sm text-slate-300">{props.action.summary}</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-cyan-200">
          {props.action.riskLevel}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-400">{props.action.rationale}</p>
      {props.action.requiresConfirmation ? (
        <div className="mt-5 flex gap-2">
          <button className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">Confirm</button>
          <button className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">Edit</button>
          <button className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">Reject</button>
        </div>
      ) : (
        <p className="mt-5 text-sm font-medium text-emerald-300">Handled automatically with audit visibility.</p>
      )}
    </article>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
}
