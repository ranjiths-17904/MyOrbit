import { useState } from 'react';
import { INTERESTS, buildRoutine } from '../lib/routine.js';
import { useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

const STEPS = ['About you', 'Interests', 'Goals', 'Your routine'];

export function WelcomePage() {
  const { vault, applyRoutine, logout, confirm } = useStore();
  const run = useAction();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState({
    age: vault.profile.age || '',
    weightKg: vault.profile.weightKg || '',
    heightCm: vault.profile.heightCm || '',
    wakeTime: vault.profile.wakeTime || '06:30',
    sleepTime: vault.profile.sleepTime || '22:30',
    studyHoursPerDay: vault.profile.studyHoursPerDay || 3,
    careerTarget: vault.profile.careerTarget || '',
    interests: vault.profile.interests || [],
    learningGoals: vault.profile.learningGoals || ''
  });

  const set = (key) => (event) => {
    setError('');
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const toggleInterest = (id) => {
    setError('');
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(id) ? current.interests.filter((item) => item !== id) : [...current.interests, id]
    }));
  };

  const payload = () => ({
    ...form,
    age: Number(form.age),
    weightKg: Number(form.weightKg),
    heightCm: Number(form.heightCm),
    studyHoursPerDay: Number(form.studyHoursPerDay)
  });

  const next = () => {
    setError('');
    if (step === 0) {
      const age = Number(form.age);
      const weight = Number(form.weightKg);
      const height = Number(form.heightCm);
      if (!Number.isInteger(age) || age < 13 || age > 90) return setError('Enter an age from 13 to 90.');
      if (!Number.isFinite(weight) || weight < 30 || weight > 250) return setError('Enter a weight from 30 to 250 kg.');
      if (!Number.isInteger(height) || height < 120 || height > 230) return setError('Enter a height from 120 to 230 cm.');
      if (!form.wakeTime || !form.sleepTime) return setError('Set both a wake time and a sleep time.');
    }
    if (step === 1 && !form.interests.length) return setError('Choose at least one interest.');
    if (step === 2) {
      try {
        setPlan(buildRoutine(payload()));
      } catch (caught) {
        return setError(caught.message);
      }
    }
    setStep((current) => current + 1);
  };

  const finish = () => run(async () => {
    const saved = await applyRoutine(payload());
    if (saved?.scheduleNote) throw new Error(`Routine saved.${saved.scheduleNote}`);
  }, 'Routine saved. Review the draft week, then approve it.');

  return (
    <section className="onboard card">
      <p className="kicker">Personal setup</p>
      <h1>Build a routine from your life, not a blank task list.</h1>
      <p className="muted">Age, body size, interests, and goals shape water, movement, screen time, and a starter technology stack. You can change every part later.</p>
      <div className="steps" aria-label="Setup progress">
        {STEPS.map((label, index) => <i key={label} className={index <= step ? 'on' : ''} title={label} />)}
      </div>
      <p className="step-label">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {step === 0 ? (
        <div className="form-grid">
          <label className="field">Age<input type="number" min="13" max="90" required value={form.age} onChange={set('age')} /></label>
          <label className="field">Weight (kg)<input type="number" min="30" max="250" step="0.1" required value={form.weightKg} onChange={set('weightKg')} /></label>
          <label className="field">Height (cm)<input type="number" min="120" max="230" required value={form.heightCm} onChange={set('heightCm')} /></label>
          <label className="field">Available study hours<input type="number" min="1" max="8" step="0.5" value={form.studyHoursPerDay} onChange={set('studyHoursPerDay')} /></label>
          <label className="field">Wake up<input type="time" required value={form.wakeTime} onChange={set('wakeTime')} /></label>
          <label className="field">Sleep<input type="time" required value={form.sleepTime} onChange={set('sleepTime')} /></label>
        </div>
      ) : null}

      {step === 1 ? (
        <>
          <label className="field">Career target<input value={form.careerTarget} onChange={set('careerTarget')} placeholder="Software developer fresher" required /></label>
          <p>What do you want this plan to lean toward?</p>
          <div className="filters">
            {INTERESTS.map((item) => (
              <button key={item.id} type="button" className={`chip ${form.interests.includes(item.id) ? 'on' : ''}`} onClick={() => toggleInterest(item.id)} aria-pressed={form.interests.includes(item.id)}>{item.label}</button>
            ))}
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <label className="field">Learning goals
          <textarea value={form.learningGoals} onChange={set('learningGoals')} placeholder="Example: Become comfortable with Java, SQL, and a small full-stack project in the next month." />
        </label>
      ) : null}

      {step === 3 && plan ? (
        <>
          <div className="routine-grid">
            <article><span>Water</span><strong>{plan.waterGlasses} glasses</strong></article>
            <article><span>Movement</span><strong>{plan.exerciseMinutes} min</strong></article>
            <article><span>Sleep</span><strong>{plan.sleepHours} h</strong></article>
            <article><span>Phone limit</span><strong>{plan.mobileLimitMinutes} min</strong></article>
          </div>
          <h3>Suggested stack</h3>
          <div className="filters">
            {plan.stack.map((item) => <span key={item.name} className="chip on">{item.name}</span>)}
          </div>
          <h3>Tasks created for you</h3>
          <ul className="plain-list">{plan.tasks.map((item) => <li key={item.title}>{item.title}</li>)}</ul>
          <h3>Habits</h3>
          <ul className="plain-list">{plan.habits.map((item) => <li key={item.title}><b>{item.title}.</b> {item.detail}</li>)}</ul>
          <p className="notice">{plan.disclaimer}</p>
        </>
      ) : null}

      <div className="row-actions">
        {step > 0 ? <button className="btn-ghost" type="button" onClick={() => { setError(''); setStep((current) => current - 1); }}>Back</button> : null}
        {step < 3 ? <button className="btn" type="button" onClick={next}>{step === 2 ? 'Generate routine' : 'Next'}</button> : <button className="btn" type="button" onClick={finish}>Done</button>}
        <button className="btn-cancel" type="button" onClick={async () => {
          if (step > 0) {
            setError('');
            setStep(0);
            return;
          }
          const ok = await confirm({ title: 'Leave setup?', message: 'You can sign in again and finish this later.', confirmLabel: 'Leave' });
          if (ok) logout();
        }}>Cancel</button>
      </div>
    </section>
  );
}
