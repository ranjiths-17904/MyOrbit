import { useState } from 'react';
import { SKILL_CATEGORIES } from '../lib/catalog.js';
import { todayISO, uid } from '../lib/dates.js';
import { Field, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function WelcomePage() {
  const { vault, updateProfile, addSkill } = useStore();
  const run = useAction();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    careerTarget: vault.profile.careerTarget || 'Software developer fresher',
    studyHoursPerDay: vault.profile.studyHoursPerDay || 4,
    wakeTime: vault.profile.wakeTime || '06:00',
    sleepTime: vault.profile.sleepTime || '23:00',
    preferredStudyStart: vault.profile.preferredStudyStart || '07:30',
    mobileLimitMinutes: vault.profile.mobileLimitMinutes || 120
  });
  const [picked, setPicked] = useState([]);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const toggle = (category, name) => {
    setPicked((current) => {
      const exists = current.some((item) => item.name === name);
      if (exists) return current.filter((item) => item.name !== name);
      return [...current, { name, category }];
    });
  };

  const finish = () => run(async () => {
    if (!picked.length) throw new Error('Choose at least one skill so the planner has something to schedule.');
    for (const item of picked) {
      await addSkill({
        id: uid(),
        name: item.name,
        category: item.category,
        currentLevel: 'beginner',
        targetLevel: 'intermediate',
        priority: 'high',
        targetDate: '',
        dailyMinutes: 45,
        resources: [],
        notes: '',
        practiceTasks: []
      });
    }
    await updateProfile({
      ...vault.profile,
      ...form,
      studyHoursPerDay: Number(form.studyHoursPerDay),
      mobileLimitMinutes: Number(form.mobileLimitMinutes),
      planStart: vault.profile.planStart || todayISO(),
      onboarded: true,
      studyDays: vault.profile.studyDays?.length ? vault.profile.studyDays : [1, 2, 3, 4, 5, 6]
    });
  }, 'Profile saved. Generate your first week from Smart Scheduler.');

  return (
    <section className="card" style={{ maxWidth: 820 }}>
      <h1>Tell the planner what you can actually do this week</h1>
      <div className="steps" aria-hidden="true">{[0, 1].map((item) => <i key={item} className={item <= step ? 'on' : ''} />)}</div>
      {step === 0 ? (
        <div className="form-grid">
          <Field label="Career target" full><input value={form.careerTarget} onChange={set('careerTarget')} /></Field>
          <Field label="Study hours per day"><input type="number" min="1" max="12" step="0.5" value={form.studyHoursPerDay} onChange={set('studyHoursPerDay')} /></Field>
          <Field label="Mobile limit (minutes)"><input type="number" min="15" max="600" value={form.mobileLimitMinutes} onChange={set('mobileLimitMinutes')} /></Field>
          <Field label="Wake up"><input type="time" value={form.wakeTime} onChange={set('wakeTime')} /></Field>
          <Field label="Sleep"><input type="time" value={form.sleepTime} onChange={set('sleepTime')} /></Field>
          <Field label="Preferred study start"><input type="time" value={form.preferredStudyStart} onChange={set('preferredStudyStart')} /></Field>
          <div className="row-actions full">
            <button className="btn" type="button" onClick={() => setStep(1)}>Next</button>
          </div>
        </div>
      ) : (
        <>
          <p className="muted">Pick the skills you want on the plan. You can set levels after this. Nothing is marked complete.</p>
          {SKILL_CATEGORIES.map((group) => (
            <div key={group.name} style={{ marginBottom: 12 }}>
              <h3>{group.name}</h3>
              <div className="filters">
                {group.skills.map((name) => (
                  <button key={name} type="button" className={`chip ${picked.some((item) => item.name === name) ? 'on' : ''}`} onClick={() => toggle(group.name, name)}>{name}</button>
                ))}
              </div>
            </div>
          ))}
          <div className="row-actions">
            <button className="btn-ghost" type="button" onClick={() => setStep(0)}>Back</button>
            <button className="btn" type="button" onClick={finish}>Save and enter</button>
          </div>
        </>
      )}
    </section>
  );
}
