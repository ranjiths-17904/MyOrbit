import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function SettingsPage() {
  const { db, vault, setTheme, updateProfile, connectServer, useBrowserOnly, exportVault, importVault, logout } = useStore();
  const run = useAction();
  const [base, setBase] = useState(localStorage.getItem('myorbit-api-base') || '');
  const [health, setHealth] = useState(null);
  const [phone, setPhone] = useState(vault.profile.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const notes = vault.profile.notifications || { web: false, email: false, sms: false };

  useEffect(() => {
    if (!db.useApi) return;
    api('/api/health').then(setHealth).catch(() => setHealth(null));
  }, [db.useApi]);

  const enableWeb = async () => {
    if (!('Notification' in window)) throw new Error('This browser does not offer notifications.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permission was not granted.');
    await updateProfile({ ...vault.profile, notifications: { ...notes, web: true } });
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(exportVault(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'myorbit-export.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await run(() => importVault(data), 'Import saved.');
  };

  return (
    <Page title="Settings" subtitle="Channels stay off until you turn them on. Secrets stay in the backend file, never in this page.">
      <div className="grid-2">
        <article className="card">
          <h3>Appearance</h3>
          <button className="btn" type="button" onClick={() => setTheme(db.theme === 'light' ? 'dark' : 'light')}>{db.theme === 'light' ? 'Use dark theme' : 'Use light theme'}</button>
        </article>
        <article className="card">
          <h3>Where data is saved</h3>
          <p>{db.useApi ? 'This session uses the API and MongoDB.' : 'This session stays in this browser until you connect a server.'}</p>
          <Field label="API address (blank uses the Vite proxy)"><input value={base} onChange={(event) => setBase(event.target.value)} placeholder="http://localhost:8080" /></Field>
          <div className="row-actions">
            <button className="btn" type="button" onClick={() => run(() => connectServer(base))}>Connect server</button>
            <button className="btn-ghost" type="button" onClick={useBrowserOnly}>Use this browser</button>
          </div>
          {health ? <p className="muted">Mail {health.mailConfigured ? 'configured' : 'not configured'}. AI {health.llmConfigured ? 'configured' : 'not configured'}. Phone webhook {health.smsConfigured ? 'configured' : 'not configured'}.</p> : null}
        </article>
        <article className="card">
          <h3>Notifications</h3>
          <label className="check-row"><span><input type="checkbox" checked={!!notes.web} onChange={(event) => {
            if (event.target.checked) run(enableWeb, 'Browser notifications on.');
            else run(() => updateProfile({ ...vault.profile, notifications: { ...notes, web: false } }));
          }} /> Website notifications while this app is open</span></label>
          <label className="check-row"><span><input type="checkbox" checked={!!notes.email} onChange={(event) => run(() => updateProfile({ ...vault.profile, notifications: { ...notes, email: event.target.checked } }))} /> Email when a week is approved (needs SMTP)</span></label>
          <label className="check-row"><span><input type="checkbox" checked={!!notes.sms} onChange={(event) => run(() => updateProfile({ ...vault.profile, notifications: { ...notes, sms: event.target.checked } }))} /> Phone webhook when a week is approved</span></label>
          <Field label="Phone number for the webhook"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></Field>
          <button className="btn-ghost" type="button" onClick={() => run(() => updateProfile({ ...vault.profile, phone }), 'Phone saved.')}>Save phone</button>
          <p className="muted">Install this site from the browser menu to use it like an app. Background push is not sent after you close the tab. A browser cannot read your phone's total screen time.</p>
          <button className="btn-ghost" type="button" onClick={() => run(() => api('/api/notifications/test', { method: 'POST', token: db.token }), 'Test notification requested.')} disabled={!db.useApi}>Send a test through enabled server channels</button>
        </article>
        {db.useApi ? (
          <article className="card">
            <h3>Password</h3>
            <Field label="Current password"><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></Field>
            <Field label="New password"><input type="password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></Field>
            <button className="btn" type="button" onClick={() => run(async () => {
              await api('/api/auth/password', { method: 'POST', token: db.token, body: { currentPassword, newPassword } });
              setCurrentPassword('');
              setNewPassword('');
            }, 'Password updated.')}>Update password</button>
          </article>
        ) : null}
        <article className="card">
          <h3>Export</h3>
          <div className="row-actions">
            <button className="btn" type="button" onClick={download}>Download JSON</button>
            <label className="btn-ghost">Import JSON<input type="file" accept="application/json" hidden onChange={onFile} /></label>
          </div>
          <p className="muted">Import replaces the current workspace after you pick a file.</p>
          <button className="btn-ghost" type="button" onClick={logout}>Log out</button>
        </article>
      </div>
    </Page>
  );
}
