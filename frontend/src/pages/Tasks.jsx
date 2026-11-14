import { useMemo, useState } from 'react';
import { PRIORITIES, TASK_CATEGORIES } from '../lib/catalog.js';
import { todayISO } from '../lib/dates.js';
import { Field, Modal, Page, Priority, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function TasksPage() {
  const { vault, addTask, updateTask, deleteTask, toggleTask, confirm } = useStore();
  const run = useAction();
  const [filter, setFilter] = useState('open');
  const [editing, setEditing] = useState(null);
  const today = todayISO();

  const rows = useMemo(() => (vault.tasks || []).filter((task) => {
    if (filter === 'open') return task.status !== 'completed';
    if (filter === 'done') return task.status === 'completed';
    if (filter === 'overdue') return task.status !== 'completed' && task.dueDate && task.dueDate < today;
    return true;
  }), [vault.tasks, filter, today]);

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const subtasks = String(data.get('subtasks') || '').split('\n').map((line) => line.trim()).filter(Boolean).map((title) => {
      const previous = (editing.subtasks || []).find((item) => item.title === title);
      return { title, done: previous?.done || false };
    });
    const task = {
      ...(editing.id ? editing : {}),
      title: data.get('title'),
      description: data.get('description'),
      category: data.get('category'),
      priority: data.get('priority'),
      startDate: data.get('startDate'),
      dueDate: data.get('dueDate'),
      estimateMin: Number(data.get('estimateMin') || 30),
      spentMin: Number(data.get('spentMin') || 0),
      recurring: data.get('recurring'),
      notes: data.get('notes'),
      subtasks,
      progress: subtasks.length ? Math.round((subtasks.filter((item) => item.done).length / subtasks.length) * 100) : Number(editing.progress || 0)
    };
    run(async () => {
      if (editing.id) await updateTask(task);
      else await addTask(task);
      setEditing(null);
    }, 'Task saved.');
  };

  return (
    <Page title="Tasks" subtitle="Manual tasks and tasks created by an approved schedule live here." actions={<button className="btn" type="button" onClick={() => setEditing({ priority: 'medium', category: 'Learning', recurring: 'none', startDate: today, dueDate: today, estimateMin: 40, spentMin: 0, subtasks: [] })}>Add task</button>}>
      <div className="filters">
        {['open', 'overdue', 'done', 'all'].map((item) => <button key={item} className={`chip ${filter === item ? 'on' : ''}`} type="button" onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="list">
        {rows.map((task) => (
          <div key={task.id} className="item">
            <input type="checkbox" checked={task.status === 'completed'} onChange={() => run(() => toggleTask(task))} aria-label={`Complete ${task.title}`} />
            <div style={{ flex: 1 }}>
              <b>{task.title}</b>
              <div className="muted">{task.category} · due {task.dueDate || '—'} · {task.estimateMin} min · {task.source || 'manual'}{task.dueDate && task.dueDate < today && task.status !== 'completed' ? ' · overdue' : ''}</div>
            </div>
            <Priority value={task.priority} />
            <button className="btn-ghost" type="button" onClick={() => setEditing(task)}>Edit</button>
          </div>
        ))}
        {rows.length === 0 ? <p className="muted">Nothing in this filter.</p> : null}
      </div>
      {editing ? (
        <Modal title={editing.id ? 'Edit task' : 'Add task'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Field label="Title"><input name="title" required defaultValue={editing.title} /></Field>
            <Field label="Description"><textarea name="description" defaultValue={editing.description} /></Field>
            <div className="form-grid">
              <Field label="Category"><select name="category" defaultValue={editing.category}>{TASK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Priority"><select name="priority" defaultValue={editing.priority}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Start"><input type="date" name="startDate" defaultValue={editing.startDate} /></Field>
              <Field label="Due"><input type="date" name="dueDate" defaultValue={editing.dueDate} /></Field>
              <Field label="Estimate (min)"><input type="number" name="estimateMin" min="5" defaultValue={editing.estimateMin} /></Field>
              <Field label="Time spent (min)"><input type="number" name="spentMin" min="0" defaultValue={editing.spentMin || 0} /></Field>
              <Field label="Repeats"><select name="recurring" defaultValue={editing.recurring || 'none'}><option value="none">none</option><option value="daily">daily</option><option value="weekly">weekly</option></select></Field>
            </div>
            <Field label="Subtasks, one per line"><textarea name="subtasks" defaultValue={(editing.subtasks || []).map((item) => item.title).join('\n')} /></Field>
            <Field label="Notes"><textarea name="notes" defaultValue={editing.notes} /></Field>
            <p className="muted">File attachments are not stored. Paste a link in notes if you need a reference.</p>
            <div className="row-actions">
              <button className="btn" type="submit">Save</button>
              {editing.id ? <button className="btn-danger" type="button" onClick={async () => {
                const ok = await confirm({ title: 'Delete task', message: editing.title, confirmLabel: 'Delete' });
                if (ok) run(() => deleteTask(editing.id), 'Task deleted.').then(() => setEditing(null));
              }}>Delete</button> : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}
