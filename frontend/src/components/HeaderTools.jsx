import { useState } from 'react';
import { Bell, CalendarDays } from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { formatLong, todayISO, weekNumber } from '../lib/dates.js';

export function HeaderTools() {
  const { vault, markAllRead } = useStore();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const unread = (vault.notifications || []).filter((item) => !item.read).length;
  const week = weekNumber(vault.profile.planStart, today);
  const day = new Date(`${today}T12:00:00`).getDay() || 7;

  return (
    <div className="top-actions">
      <div className="date-pill">
        <CalendarDays size={16} />
        <div>
          <strong>{formatLong(today)}</strong>
          <div><small>Week {week} · Day {day}</small></div>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <button
          className="bell"
          type="button"
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => { setOpen((value) => !value); markAllRead(); }}
        >
          <Bell size={18} />
          {unread > 0 ? <span className="badge">{unread}</span> : null}
        </button>
        {open ? (
          <div className="pop">
            {(vault.notifications || []).slice(0, 8).map((item) => (
              <div key={item.id} className="notice">
                <Bell size={14} />
                <div><strong>{item.title}</strong><div className="muted">{item.body}</div></div>
              </div>
            ))}
            {(vault.notifications || []).length === 0 ? <p className="muted">No reminders yet.</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
