import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Bot, Brain, CalendarDays, CheckSquare, HeartPulse, LayoutDashboard,
  Menu, Moon, NotebookPen, Settings, Smartphone, Sparkles, Sun, Target, Trophy, UserRound
} from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { addDays, todayISO } from '../lib/dates.js';
import { HeaderTools } from './HeaderTools.jsx';

const LINKS = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/scheduler', 'Smart Scheduler', Sparkles],
  ['/calendar', 'Calendar', CalendarDays],
  ['/skills', 'Learning', Brain],
  ['/tasks', 'Tasks', CheckSquare],
  ['/notes', 'Notes', NotebookPen],
  ['/health', 'Health & Fitness', HeartPulse],
  ['/mobile', 'Mobile Tracker', Smartphone],
  ['/reports', 'Reports', Target],
  ['/assistant', 'AI Assistant', Bot],
  ['/profile', 'Profile', UserRound],
  ['/settings', 'Settings', Settings]
];

export function Shell({ children }) {
  const { vault, db, setTheme, pushNotification } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const home = location.pathname === '/';
  const today = todayISO();

  useEffect(() => {
    if (!vault?.profile?.onboarded) return;
    const overdue = (vault.tasks || []).filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate < today);
    overdue.slice(0, 5).forEach((task) => {
      pushNotification({ key: `overdue-${task.id}-${task.dueDate}`, title: 'Overdue task', body: task.title, level: 'warn' });
    });
    const soon = (vault.tasks || []).filter((task) => task.status !== 'completed' && task.dueDate && task.dueDate >= today && task.dueDate <= addDays(today, 1));
    soon.slice(0, 4).forEach((task) => {
      pushNotification({ key: `due-${task.id}-${task.dueDate}`, title: task.dueDate === today ? 'Due today' : 'Due tomorrow', body: task.title, level: 'info' });
    });
    const review = vault.lastReview?.weekStart;
    if (review && addDays(review, 7) <= today) {
      pushNotification({ key: `review-${review}`, title: 'Weekly review', body: 'Seven days have passed. Generate the next week and approve it before it replaces the plan.', level: 'info' });
    }
  }, [vault?.tasks, vault?.lastReview, vault?.profile?.onboarded, today]);

  useEffect(() => {
    if (!vault?.profile?.notifications?.web || Notification.permission !== 'granted') return;
    const fresh = (vault.notifications || []).find((item) => !item.read);
    if (!fresh) return;
    const seen = sessionStorage.getItem('myorbit-note');
    if (seen === fresh.id) return;
    sessionStorage.setItem('myorbit-note', fresh.id);
    new Notification(fresh.title, { body: fresh.body });
  }, [vault?.notifications, vault?.profile?.notifications?.web]);

  return (
    <div className="app-shell">
      {open ? <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><Brain size={22} color="white" /></div>
          <div className="brand-name">AI Life<span>Scheduler</span></div>
        </div>
        <nav className="nav">
          {LINKS.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')} onClick={() => setOpen(false)}>
              <Icon /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <div className="cheer">
            <Trophy size={16} color="#fbbf24" />
            <strong>You're doing great!</strong>
            <span>Keep going.</span>
          </div>
          <button className="theme-toggle" type="button" onClick={() => setTheme(db.theme === 'light' ? 'dark' : 'light')}>
            {db.theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {db.theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <div className="mode-pill">
            <span>{db.useApi ? 'Saved on your server' : 'Saved in this browser'}</span>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className={`topbar ${home ? 'topbar-home' : ''}`}>
          <button className="menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          {home ? null : <HeaderTools />}
        </header>
        {children}
      </main>
    </div>
  );
}
