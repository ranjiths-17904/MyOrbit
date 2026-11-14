import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import { api } from '../api.js';
import { Field, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function AuthPage() {
  const { login, register, enterDemo, connectServer } = useStore();
  const run = useAction();
  const [mode, setMode] = useState('login');
  const [health, setHealth] = useState(undefined);
  const [form, setForm] = useState({ name: '', email: '', password: '', careerTarget: 'Software developer fresher' });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    api('/api/health').then(setHealth).catch(() => setHealth(null));
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'login') run(() => login(form.email, form.password));
    else run(() => register(form));
  };

  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <div className="brand">
          <div className="brand-mark"><Brain size={22} color="white" /></div>
          <div className="brand-name">AI Life<span>Scheduler</span></div>
        </div>
        <h1 className="hello" style={{ marginTop: 28 }}>Plan the week from your real goals.</h1>
        <p className="sub">Study time, tasks, health, and screen time stay in one place. The timetable changes only after you approve it.</p>
        <ul className="auth-points">
          <li>Weaker, higher-priority skills get more of the hours you actually have.</li>
          <li>A week is not replaced until you review the proposed plan.</li>
          <li>Works in this browser today. Connect MongoDB when you want an account on your server.</li>
        </ul>
      </section>
      <section className="auth-card card">
        <div className="filters">
          <button className={`chip ${mode === 'login' ? 'on' : ''}`} type="button" onClick={() => setMode('login')}>Sign in</button>
          <button className={`chip ${mode === 'register' ? 'on' : ''}`} type="button" onClick={() => setMode('register')}>Create account</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'register' ? (
            <>
              <Field label="Name"><input required value={form.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field label="Career target"><input value={form.careerTarget} onChange={set('careerTarget')} /></Field>
            </>
          ) : null}
          <Field label="Email"><input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Password"><input required minLength={8} type="password" value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          <button className="btn" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="row-actions" style={{ marginTop: 14 }}>
          <button className="btn-ghost" type="button" onClick={() => run(() => enterDemo())}>Open sample workspace</button>
          {health ? (
            <button className="btn-ghost" type="button" onClick={() => run(() => connectServer(''), 'Server connected. Sign in with the account stored in MongoDB.')}>Use the API server</button>
          ) : null}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          {health === undefined ? 'Checking the API…' : health ? `API is up. Mail ${health.mailConfigured ? 'on' : 'off'}. AI ${health.llmConfigured ? 'on' : 'off'}.` : 'API is not running. Browser mode still saves on this device.'}
        </p>
        <p className="muted">Sample workspace numbers are demo data, kept separate from an empty account.</p>
      </section>
    </div>
  );
}
