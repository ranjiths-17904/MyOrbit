import { useState } from 'react';
import { Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';
import { formatDay, minutesToLabel, startOfWeek, todayISO } from '../lib/dates.js';
import { freeMinutes } from '../lib/scheduler.js';

export function SchedulerPage() {
  const { vault, proposeWeek, approveProposal, discardProposal, reschedule, markMissedPast } = useStore();
  const run = useAction();
  const [busy, setBusy] = useState(false);
  const proposal = vault.proposal;
  const weekStart = startOfWeek(todayISO());

  const generate = () => {
    setBusy(true);
    run(async () => {
      markMissedPast();
      await proposeWeek(weekStart);
    }, 'Draft week is ready. It is not active until you approve it.').finally(() => setBusy(false));
  };

  const grouped = new Map();
  (proposal?.blocks || []).forEach((block) => {
    const list = grouped.get(block.date) || [];
    list.push(block);
    grouped.set(block.date, list);
  });

  return (
    <Page
      title="Smart Scheduler"
      subtitle="The next week is a draft. It uses your saved hours, skill gaps, deadlines, and last review. It becomes the calendar only after you approve it."
      actions={
        <>
          <button className="btn" type="button" disabled={busy} onClick={generate}>{busy ? 'Building…' : 'Generate this week'}</button>
          <button className="btn-ghost" type="button" onClick={() => run(() => Promise.resolve(reschedule()), 'Missed blocks were moved into open slots where one existed.')}>Reschedule missed</button>
        </>
      }
    >
      {vault.lastReview ? (
        <article className="card" style={{ marginBottom: 12 }}>
          <h3>Previous review</h3>
          <p>Productivity snapshot {vault.lastReview.productivity ?? '—'}%. Consistency {Math.round((vault.lastReview.consistency || 0) * 100)}%.</p>
          <ul>{(vault.lastReview.recommendations || []).map((line) => <li key={line}>{line}</li>)}</ul>
        </article>
      ) : <p className="muted">No weekly review is saved yet. Generate a week, work the plan, then generate again next week.</p>}

      {proposal ? (
        <>
          <article className="card" style={{ marginBottom: 12 }}>
            <h3>Why this draft changed</h3>
            <ul>{proposal.rationale.map((line) => <li key={line}>{line}</li>)}</ul>
            {proposal.warnings?.length ? <div className="warn">{proposal.warnings.map((line) => <div key={line}>{line}</div>)}</div> : <p className="ok-text">No overlap in this draft.</p>}
            {proposal.review ? <p>This review scores the week already on the calendar, then the draft applies those weights. Planned {minutesToLabel(proposal.review.plannedMin)}, finished {minutesToLabel(proposal.review.actualMin)}.</p> : null}
            <div className="row-actions">
              <button className="btn" type="button" onClick={() => run(() => approveProposal(), 'Week approved and saved.')}>Approve and activate</button>
              <button className="btn-ghost" type="button" onClick={discardProposal}>Discard draft</button>
            </div>
          </article>
          <div className="week-board">
            {[...grouped.keys()].sort().map((date) => (
              <div key={date} className="week-col">
                <h4>{formatDay(date)}</h4>
                <div className="free-tag">Free {minutesToLabel(freeMinutes(proposal.blocks, date, vault.profile))}</div>
                {grouped.get(date).map((block) => (
                  <div key={block.id} className="item" style={{ marginTop: 6 }}>
                    <div><b>{block.start}–{block.end}</b><div className="muted">{block.title}</div></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Page>
  );
}
