import { useState } from 'react';
import { LEVELS, PRIORITIES, SKILL_CATEGORIES, levelProgress } from '../lib/catalog.js';
import { Field, Modal, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

const blank = () => ({
  name: '', category: 'Programming', currentLevel: 'beginner', targetLevel: 'intermediate',
  priority: 'high', targetDate: '', dailyMinutes: 45, resourcesText: '', notes: '', practiceText: ''
});

export function SkillsPage() {
  const { vault, addSkill, updateSkill, deleteSkill, confirm } = useStore();
  const run = useAction();
  const [editing, setEditing] = useState(null);

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const skill = {
      ...(editing.id ? editing : {}),
      name: data.get('name'),
      category: data.get('category'),
      currentLevel: data.get('currentLevel'),
      targetLevel: data.get('targetLevel'),
      priority: data.get('priority'),
      targetDate: data.get('targetDate'),
      dailyMinutes: Number(data.get('dailyMinutes') || 0),
      resources: String(data.get('resourcesText') || '').split('\n').map((line) => line.trim()).filter(Boolean),
      notes: data.get('notes'),
      practiceTasks: String(data.get('practiceText') || '').split('\n').map((line) => line.trim()).filter(Boolean)
    };
    run(async () => {
      if (editing.id) await updateSkill(skill);
      else await addSkill(skill);
      setEditing(null);
    }, 'Skill saved.');
  };

  return (
    <Page title="Learning" subtitle="The planner gives more time to a larger level gap and a higher priority." actions={<button className="btn" type="button" onClick={() => setEditing(blank())}>Add skill</button>}>
      <div className="list">
        {(vault.skills || []).map((skill) => (
          <div key={skill.id} className="item">
            <div style={{ flex: 1 }}>
              <b>{skill.name}</b>
              <div className="muted">{skill.category} · {skill.currentLevel} → {skill.targetLevel} · {skill.dailyMinutes} min/day</div>
              <div className="skill-track" style={{ marginTop: 6 }}><span className="fill-purple" style={{ width: `${levelProgress(skill.currentLevel, skill.targetLevel)}%` }} /></div>
            </div>
            <span className={`pill p-${skill.priority}`}>{skill.priority}</span>
            <button className="btn-ghost" type="button" onClick={() => setEditing({ ...skill, resourcesText: (skill.resources || []).join('\n'), practiceText: (skill.practiceTasks || []).join('\n') })}>Edit</button>
          </div>
        ))}
        {(vault.skills || []).length === 0 ? <p className="muted">No skills yet.</p> : null}
      </div>
      {editing ? (
        <Modal title={editing.id ? 'Edit skill' : 'Add skill'} onClose={() => setEditing(null)} wide>
          <form onSubmit={save}>
            <div className="filters">
              {SKILL_CATEGORIES.flatMap((group) => group.skills.map((name) => (
                <button key={name} className="chip" type="button" onClick={() => setEditing((current) => ({ ...current, name, category: group.name }))}>{name}</button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Name"><input name="name" required defaultValue={editing.name} key={editing.name} /></Field>
              <Field label="Category"><input name="category" required defaultValue={editing.category} key={editing.category} /></Field>
              <Field label="Current level"><select name="currentLevel" defaultValue={editing.currentLevel}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></Field>
              <Field label="Target level"><select name="targetLevel" defaultValue={editing.targetLevel}>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></Field>
              <Field label="Priority"><select name="priority" defaultValue={editing.priority}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Daily minutes"><input name="dailyMinutes" type="number" min="0" max="240" defaultValue={editing.dailyMinutes} /></Field>
              <Field label="Target date"><input name="targetDate" type="date" defaultValue={editing.targetDate || ''} /></Field>
            </div>
            <Field label="Resources, one per line"><textarea name="resourcesText" defaultValue={editing.resourcesText || ''} /></Field>
            <Field label="Practice tasks, one per line"><textarea name="practiceText" defaultValue={editing.practiceText || ''} /></Field>
            <Field label="Notes"><textarea name="notes" defaultValue={editing.notes || ''} /></Field>
            <div className="row-actions">
              <button className="btn" type="submit">Save</button>
              {editing.id ? <button className="btn-danger" type="button" onClick={async () => {
                const ok = await confirm({ title: 'Delete skill', message: `Delete ${editing.name}? Past blocks stay on the calendar.`, confirmLabel: 'Delete' });
                if (ok) run(() => deleteSkill(editing.id), 'Skill deleted.').then(() => setEditing(null));
              }}>Delete</button> : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </Page>
  );
}
