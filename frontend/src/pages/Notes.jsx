import { useMemo, useState } from 'react';
import { NOTE_TYPES } from '../lib/catalog.js';
import { Field, Modal, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function NotesPage() {
  const { vault, addNote, updateNote, deleteNote, confirm } = useStore();
  const run = useAction();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => (vault.notes || []).filter((note) => {
    const hay = `${note.title} ${note.body}`.toLowerCase();
    if (query && !hay.includes(query.toLowerCase())) return false;
    if (type !== 'all' && note.type !== type) return false;
    return true;
  }).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')), [vault.notes, query, type]);

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const note = { ...(editing.id ? editing : {}), title: data.get('title'), body: data.get('body'), type: data.get('type'), taskId: data.get('taskId') };
    run(async () => {
      if (editing.id) await updateNote(note);
      else await addNote(note);
      setEditing(null);
    }, 'Note saved.');
  };

  return (
    <Page title="Notes" subtitle="Learning notes, problems, interview questions, and reflections. Each save keeps the time it was written." actions={<button className="btn" type="button" onClick={() => setEditing({ type: 'learning', title: '', body: '', taskId: '' })}>Add note</button>}>
      <div className="filters">
        <input placeholder="Search notes" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search notes" />
        <button className={`chip ${type === 'all' ? 'on' : ''}`} type="button" onClick={() => setType('all')}>All</button>
        {NOTE_TYPES.map((item) => <button key={item.id} className={`chip ${type === item.id ? 'on' : ''}`} type="button" onClick={() => setType(item.id)}>{item.label}</button>)}
      </div>
      <div className="list">
        {rows.map((note) => (
          <button key={note.id} className="item" type="button" onClick={() => setEditing(note)} style={{ textAlign: 'left' }}>
            <div>
              <b>{note.title}</b>
              <div className="muted">{note.type} · {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : ''}</div>
            </div>
          </button>
        ))}
        {rows.length === 0 ? <p className="muted">No notes match.</p> : null}
      </div>
      {editing ? (
        <Modal title={editing.id ? 'Edit note' : 'Add note'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <Field label="Title"><input name="title" required defaultValue={editing.title} /></Field>
            <div className="form-grid">
              <Field label="Type"><select name="type" defaultValue={editing.type}>{NOTE_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
              <Field label="Linked task">
                <select name="taskId" defaultValue={editing.taskId || ''}>
                  <option value="">None</option>
                  {(vault.tasks || []).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Body"><textarea name="body" required defaultValue={editing.body} style={{ minHeight: 160 }} /></Field>
            <div className="row-actions">
              <button className="btn" type="submit">Save</button>
              {editing.id ? <button className="btn-danger" type="button" onClick={async () => {
                const ok = await confirm({ title: 'Delete note', message: editing.title, confirmLabel: 'Delete' });
                if (ok) run(() => deleteNote(editing.id), 'Note deleted.').then(() => setEditing(null));
              }}>Delete</button> : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}
