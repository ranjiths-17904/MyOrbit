import { useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { todayISO } from '../lib/dates.js';
import { weekSeries } from '../lib/metrics.js';
import { fitnessDayScore } from '../lib/scheduler.js';
import { Field, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function HealthPage() {
  const { vault, saveFitness, addRoutine, deleteRoutine, confirm } = useStore();
  const run = useAction();
  const today = todayISO();
  const existing = (vault.fitness || []).find((row) => row.date === today) || {
    date: today, waterGlasses: 0, sleepHours: 0, wakeTime: vault.profile.wakeTime || '06:00',
    exerciseMin: 0, walkMin: 0, runMin: 0, pushUps: 0, weightKg: '', restDay: false, note: ''
  };
  const [routineName, setRoutineName] = useState('');
  const series = weekSeries(vault.fitness, 'exerciseMin');
  const goal = Math.min(90, Number(vault.profile.fitness?.exerciseMinutes) || 30);

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const exerciseMin = Math.min(180, Number(data.get('exerciseMin') || 0));
    run(async () => {
      if (exerciseMin > 90) throw new Error('Keep logged hard exercise at 90 minutes or less. Split a longer day or mark the extra time as a walk.');
      await saveFitness({
        date: today,
        waterGlasses: Number(data.get('waterGlasses') || 0),
        sleepHours: Number(data.get('sleepHours') || 0),
        wakeTime: data.get('wakeTime'),
        exerciseMin,
        walkMin: Number(data.get('walkMin') || 0),
        runMin: Number(data.get('runMin') || 0),
        pushUps: Number(data.get('pushUps') || 0),
        weightKg: data.get('weightKg'),
        restDay: data.get('restDay') === 'on',
        note: data.get('note')
      });
    }, 'Health log saved. This is a personal log, not a medical assessment.');
  };

  return (
    <Page title="Health & Fitness" subtitle="Log what you did. The planner keeps workouts short and leaves your rest day free of hard exercise.">
      <div className="split">
        <form className="card" onSubmit={save}>
          <h3>Today</h3>
          <p className="muted">Score from your log: {fitnessDayScore(existing, vault.profile)}%. Goal is about {goal} minutes, never a diagnosis.</p>
          <Field label="Water (glasses)"><input name="waterGlasses" type="number" min="0" max="20" defaultValue={existing.waterGlasses} /></Field>
          <Field label="Sleep hours"><input name="sleepHours" type="number" min="0" max="14" step="0.5" defaultValue={existing.sleepHours} /></Field>
          <Field label="Wake time"><input name="wakeTime" type="time" defaultValue={existing.wakeTime} /></Field>
          <Field label="Exercise minutes"><input name="exerciseMin" type="number" min="0" max="90" defaultValue={existing.exerciseMin} /></Field>
          <Field label="Walk minutes"><input name="walkMin" type="number" min="0" max="180" defaultValue={existing.walkMin || 0} /></Field>
          <Field label="Run minutes"><input name="runMin" type="number" min="0" max="90" defaultValue={existing.runMin || 0} /></Field>
          <Field label="Push-ups"><input name="pushUps" type="number" min="0" max="200" defaultValue={existing.pushUps || 0} /></Field>
          <Field label="Weight (kg, optional)"><input name="weightKg" defaultValue={existing.weightKg || ''} /></Field>
          <label className="check-row"><span><input name="restDay" type="checkbox" defaultChecked={existing.restDay} /> Rest day</span></label>
          <Field label="Note"><textarea name="note" defaultValue={existing.note || ''} /></Field>
          <button className="btn" type="submit">Save today</button>
        </form>
        <div>
          <article className="card" style={{ marginBottom: 12 }}>
            <h3>Exercise minutes this week</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <XAxis dataKey="label" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
          <article className="card">
            <h3>Your routines</h3>
            <div className="composer">
              <input value={routineName} onChange={(event) => setRoutineName(event.target.value)} placeholder="Routine name" aria-label="Routine name" />
              <button className="btn" type="button" onClick={() => run(async () => {
                if (!routineName.trim()) throw new Error('Name the routine.');
                await addRoutine({ name: routineName.trim(), minutes: goal, exercises: ['Walk or mobility', 'A short strength set'] });
                setRoutineName('');
              }, 'Routine saved.')}>Add</button>
            </div>
            <div className="list" style={{ marginTop: 10 }}>
              {(vault.routines || []).map((routine) => (
                <div key={routine.id} className="item">
                  <div><b>{routine.name}</b><div className="muted">{routine.minutes} min · {(routine.exercises || []).join(', ')}</div></div>
                  <button className="btn-ghost" type="button" onClick={async () => {
                    const ok = await confirm({ title: 'Delete routine', message: routine.name, confirmLabel: 'Delete' });
                    if (ok) run(() => deleteRoutine(routine.id), 'Routine removed.');
                  }}>Delete</button>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </Page>
  );
}
