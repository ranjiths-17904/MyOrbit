import { useState } from 'react';
import { uid } from '../lib/dates.js';
import { Field, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ProfilePage() {
  const { vault, updateProfile, logout } = useStore();
  const run = useAction();
  const profile = vault.profile;
  const [goal, setGoal] = useState('');
  const goals = profile.goals || [];
  const family = profile.familyBlocks || [];

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const studyDays = DAYS.map((_, index) => index).filter((index) => data.get(`day-${index}`) === 'on');
    const restDays = DAYS.map((_, index) => index).filter((index) => data.get(`rest-${index}`) === 'on');
    run(() => updateProfile({
      ...profile,
      name: data.get('name'),
      careerTarget: data.get('careerTarget'),
      wakeTime: data.get('wakeTime'),
      sleepTime: data.get('sleepTime'),
      preferredStudyStart: data.get('preferredStudyStart'),
      studyHoursPerDay: Number(data.get('studyHoursPerDay')),
      studyDays,
      mobileLimitMinutes: Number(data.get('mobileLimitMinutes')),
      fitness: {
        ...(profile.fitness || {}),
        exerciseMinutes: Number(data.get('exerciseMinutes')),
        waterGlasses: Number(data.get('waterGlasses')),
        sleepHours: Number(data.get('sleepHours')),
        restDays
      }
    }), 'Profile saved.');
  };

  return (
    <Page title="Profile" subtitle="The scheduler reads these hours, days, and limits. It does not invent extra time." actions={<button className="btn-ghost" type="button" onClick={logout}>Log out</button>}>
      <form className="card" onSubmit={save}>
        <div className="form-grid">
          <Field label="Name"><input name="name" required defaultValue={profile.name} /></Field>
          <Field label="Email"><input value={profile.email || ''} disabled /></Field>
          <Field label="Career target" full><input name="careerTarget" defaultValue={profile.careerTarget || ''} /></Field>
          <Field label="Study hours / day"><input name="studyHoursPerDay" type="number" min="1" max="12" step="0.5" defaultValue={profile.studyHoursPerDay} /></Field>
          <Field label="Mobile limit (min)"><input name="mobileLimitMinutes" type="number" min="15" defaultValue={profile.mobileLimitMinutes} /></Field>
          <Field label="Wake"><input name="wakeTime" type="time" defaultValue={profile.wakeTime} /></Field>
          <Field label="Sleep"><input name="sleepTime" type="time" defaultValue={profile.sleepTime} /></Field>
          <Field label="Study start"><input name="preferredStudyStart" type="time" defaultValue={profile.preferredStudyStart} /></Field>
          <Field label="Exercise goal (min)"><input name="exerciseMinutes" type="number" min="0" max="90" defaultValue={profile.fitness?.exerciseMinutes || 30} /></Field>
          <Field label="Water goal"><input name="waterGlasses" type="number" min="1" max="16" defaultValue={profile.fitness?.waterGlasses || 8} /></Field>
          <Field label="Sleep goal (hours)"><input name="sleepHours" type="number" min="4" max="10" step="0.5" defaultValue={profile.fitness?.sleepHours || 7} /></Field>
        </div>
        <p>Study days</p>
        <div className="filters">{DAYS.map((label, index) => <label key={label} className="chip"><input type="checkbox" name={`day-${index}`} defaultChecked={(profile.studyDays || []).includes(index)} /> {label}</label>)}</div>
        <p>Fitness rest days</p>
        <div className="filters">{DAYS.map((label, index) => <label key={label} className="chip"><input type="checkbox" name={`rest-${index}`} defaultChecked={(profile.fitness?.restDays || [0]).includes(index)} /> {label}</label>)}</div>
        <button className="btn" type="submit">Save profile</button>
      </form>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>Goals</h3>
        <div className="composer">
          <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Goal title" aria-label="Goal title" />
          <button className="btn" type="button" onClick={() => run(async () => {
            if (!goal.trim()) throw new Error('Write a goal first.');
            const next = [...goals, { id: uid(), title: goal.trim(), targetDate: '', status: 'active' }];
            await updateProfile({ ...profile, goals: next });
            setGoal('');
          }, 'Goal added.')}>Add</button>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {goals.map((item) => (
            <div key={item.id} className="item">
              <span>{item.title}</span>
              <button className="btn-ghost" type="button" onClick={() => run(() => updateProfile({ ...profile, goals: goals.filter((goalItem) => goalItem.id !== item.id) }))}>Remove</button>
            </div>
          ))}
        </div>
      </article>
      <article className="card" style={{ marginTop: 12 }}>
        <h3>Family responsibilities</h3>
        <p className="muted">These blocks are reserved before study time.</p>
        {family.map((block) => (
          <div key={block.id} className="item">
            <span>{block.title} · {block.start}–{block.end}</span>
            <button className="btn-ghost" type="button" onClick={() => run(() => updateProfile({ ...profile, familyBlocks: family.filter((item) => item.id !== block.id) }))}>Remove</button>
          </div>
        ))}
        <button className="btn-ghost" type="button" onClick={() => run(() => updateProfile({
          ...profile,
          familyBlocks: [...family, { id: uid(), title: 'Family time', start: '18:00', end: '19:00', days: [1, 2, 3, 4, 5] }]
        }), 'A weekday 18:00–19:00 block was added. Edit times by removing and adding again if you need a different slot.')}>Add a weekday evening block</button>
      </article>
    </Page>
  );
}
