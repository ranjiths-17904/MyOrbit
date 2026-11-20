import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function AuthPage() {
  const { login, register } = useStore();
  const run = useAction();
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', careerTarget: 'Software developer fresher' });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'login') run(() => login(form.email, form.password));
    else run(() => register(form));
  };

  return (
    <section className="gate-auth">
      <div className="auth-card card">
        <p className="gate-kicker">Login</p>
        <h1>Enter your orbit</h1>
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
          <Field label="Password">
            <span className="password-control">
              <input required minLength={8} type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </Field>
          <button className="btn auth-submit" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
      </div>
    </section>
  );
}
