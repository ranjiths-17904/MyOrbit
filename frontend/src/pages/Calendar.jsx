import { useMemo, useState } from 'react';
import { Page, Field, Modal, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';
import { addDays, formatDay, monthLabel, startOfMonth, startOfWeek, todayISO, uid, daysInMonth, parseISODate } from '../lib/dates.js';
import { freeMinutes, moveBlock } from '../lib/scheduler.js';

const TYPES = ['theory', 'coding', 'practice', 'project', 'revision', 'task', 'fitness', 'personal', 'break'];
const COLORS = { theory: '#8b5cf6', coding: '#22d3ee', practice: '#34d399', project: '#fb923c', revision: '#f472b6', task: '#60a5fa', fitness: '#fbbf24', personal: '#a78bfa', break: '#64748b' };

export function CalendarPage() {
  const { vault, addBlock, updateBlock, deleteBlock, confirm } = useStore();
  const run = useAction();
  const [cursor, setCursor] = useState(todayISO());
  const [view, setView] = useState('week');
  const [editing, setEditing] = useState(null);
  const [dragId, setDragId] = useState(null);
  const weekStart = startOfWeek(cursor);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const onDropDay = (date) => {
    if (!dragId) return;
    const block = vault.blocks.find((item) => item.id === dragId);
    setDragId(null);
    if (!block) return;
    const [h, m] = block.start.split(':').map(Number);
    run(() => updateBlock(moveBlock(block, date, h * 60 + m)), 'Block moved.');
  };

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const block = {
      id: editing.id || uid(),
      date: data.get('date'),
      start: data.get('start'),
      end: data.get('end'),
      title: data.get('title'),
      type: data.get('type'),
      difficulty: 'medium',
      status: editing.status || 'planned',
      source: editing.source || 'manual'
    };
    run(async () => {
      if (editing.id) await updateBlock({ ...editing, ...block });
      else await addBlock(block);
      setEditing(null);
    }, 'Schedule saved.');
  };

  const monthStart = startOfMonth(cursor);
  const firstWeekday = (parseISODate(monthStart).getDay() + 6) % 7;
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth(cursor) }, (_, i) => addDays(monthStart, i))];

  return (
    <Page
      title="Calendar"
      subtitle="Drag a block to another day. Overlaps are rejected. Free time is the gap between wake and sleep."
      actions={
        <>
          <button className="btn-ghost" type="button" onClick={() => setCursor(addDays(cursor, view === 'week' ? -7 : -30))}>Prev</button>
          <button className="btn-ghost" type="button" onClick={() => setCursor(todayISO())}>Today</button>
          <button className="btn-ghost" type="button" onClick={() => setCursor(addDays(cursor, view === 'week' ? 7 : 30))}>Next</button>
          <button className={`chip ${view === 'week' ? 'on' : ''}`} type="button" onClick={() => setView('week')}>Week</button>
          <button className={`chip ${view === 'month' ? 'on' : ''}`} type="button" onClick={() => setView('month')}>Month</button>
          <button className="btn" type="button" onClick={() => setEditing({ date: todayISO(), start: '09:00', end: '09:45', title: '', type: 'practice' })}>Add block</button>
        </>
      }
    >
      {view === 'week' ? (
        <div className="week-board">
          {days.map((date) => (
            <div key={date} className="week-col" onDragOver={(event) => event.preventDefault()} onDrop={() => onDropDay(date)}>
              <h4>{formatDay(date)}</h4>
              <div className="free-tag">Free {minutesToLabelSafe(freeMinutes(vault.blocks, date, vault.profile))}</div>
              {vault.blocks.filter((block) => block.date === date && block.status !== 'cancelled').sort((a, b) => a.start.localeCompare(b.start)).map((block) => (
                <button
                  key={block.id}
                  className="event"
                  draggable
                  onDragStart={() => setDragId(block.id)}
                  type="button"
                  style={{ background: COLORS[block.type] || '#8b5cf6', opacity: block.status === 'completed' ? 0.55 : 1 }}
                  onClick={() => setEditing(block)}
                >
                  {block.start} {block.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <h3>{monthLabel(cursor)}</h3>
          <div className="month-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => <div key={label} className="cal-head">{label}</div>)}
            {cells.map((date, index) => (
              <div key={date || `e-${index}`} className="month-cell">
                {date ? (
                  <>
                    <strong>{Number(date.slice(-2))}</strong>
                    {vault.blocks.filter((block) => block.date === date && block.status !== 'cancelled').slice(0, 3).map((block) => (
                      <button key={block.id} className="event" type="button" style={{ background: COLORS[block.type] || '#8b5cf6' }} onClick={() => setEditing(block)}>{block.title}</button>
                    ))}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
      {editing ? (
        <Modal title={editing.id ? 'Edit block' : 'Add block'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Field label="Title"><input name="title" required defaultValue={editing.title} /></Field>
            <div className="form-grid">
              <Field label="Date"><input name="date" type="date" required defaultValue={editing.date} /></Field>
              <Field label="Type"><select name="type" defaultValue={editing.type}>{TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
              <Field label="Start"><input name="start" type="time" required defaultValue={editing.start} /></Field>
              <Field label="End"><input name="end" type="time" required defaultValue={editing.end} /></Field>
            </div>
            <div className="row-actions">
              <button className="btn" type="submit">Save</button>
              {editing.id ? <button className="btn-danger" type="button" onClick={async () => {
                const ok = await confirm({ title: 'Remove block', message: 'This removes the time block. The linked task, if any, stays in Tasks.', confirmLabel: 'Remove' });
                if (ok) run(() => deleteBlock(editing.id), 'Block removed.').then(() => setEditing(null));
              }}>Delete</button> : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}

function minutesToLabelSafe(min) {
  const n = Math.max(0, Math.round(min));
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
