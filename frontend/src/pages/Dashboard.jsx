import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { motion } from 'framer-motion';
import {
  Atom, BedDouble, Bell, Braces, CheckCircle2, Circle, Code2, Coffee, Database, Droplets,
  Dumbbell, Flame, Headphones, Heart, Smartphone, Star, Timer, ListChecks, TrendingUp, Trophy
} from 'lucide-react';
import { useStore } from '../store/Store.jsx';
import { HeaderTools } from '../components/HeaderTools.jsx';
import { useAction } from '../components/ui.jsx';
import { dashboardModel, formatHours } from '../lib/metrics.js';
import { levelProgress } from '../lib/catalog.js';
import { minutesToLabel } from '../lib/dates.js';

const BAR_COLORS = ['#22d3ee', '#38bdf8', '#818cf8', '#fb923c', '#e879f9', '#a78bfa', '#2dd4bf'];

const SKILL_COLORS = ['#fb923c', '#22d3ee', '#60a5fa', '#a3e635', '#c084fc'];

export function Dashboard() {
  const { vault, toggleTask, updateBlock, updateTask } = useStore();
  const run = useAction();
  const model = dashboardModel(vault);
  const skills = (vault.skills || []).slice(0, 5);
  const quick = (vault.tasks || []).filter((task) => task.dueDate === model.today || task.startDate === model.today).slice(0, 5);
  const goals = (vault.profile.goals?.length ? vault.profile.goals : vault.goals) || [];
  const mobile = model.mobile;
  const limit = Number(vault.profile.mobileLimitMinutes) || 120;
  const fit = model.fitness;

  const completeBlock = (block) => run(async () => {
    const done = block.status !== 'completed';
    await updateBlock({ ...block, status: done ? 'completed' : 'planned', actualMin: done ? undefined : 0 });
    if (block.taskId) {
      const task = vault.tasks.find((item) => item.id === block.taskId);
      if (task) await updateTask({ ...task, status: done ? 'completed' : 'pending', progress: done ? 100 : 0, completedAt: done ? new Date().toISOString() : null });
    }
  });

  const waterGoal = Number(vault.profile.fitness?.waterGlasses) || 8;
  const waterPct = fit ? Math.min(100, (Number(fit.waterGlasses) / waterGoal) * 100) : 0;
  const sleepPct = fit ? Math.min(100, (Number(fit.sleepHours) / 8) * 100) : 0;
  const movePct = fit ? Math.min(100, (Number(fit.exerciseMin) / 30) * 100) : 0;

  return (
    <div className="dash">
      {vault.demo ? (
        <div className="demo-banner">
          <span>This workspace is sample data so you can see the layout. Create an account for an empty plan that starts at zero.</span>
        </div>
      ) : null}
      <div className="hero">
        <div className="hello-row">
          <div className="avatar" aria-hidden="true"><span style={{ fontSize: 28 }}>🧑‍💻</span></div>
          <div>
            <h1 className="hello">Hello, {vault.profile.name?.split(' ')[0] || 'Developer'}! <span aria-hidden="true">👋</span></h1>
            <p className="sub">Let's achieve your goals together!</p>
          </div>
        </div>
        <div className="hero-side">
          <HeaderTools />
          <div className="robot-wrap">
            <div className="speech">{model.progress >= 70 ? "You're on track! Keep going!" : 'Start with the first open block.'}</div>
            <Robot />
          </div>
        </div>
      </div>

      <section className="stats">
        <Stat className="g-green" icon={<CheckCircle2 size={16} />} label="Today's Progress" value={`${model.progress}%`} fill="fill-green" pct={model.progress} />
        <Stat className="g-purple" icon={<Timer size={16} />} label="Study Hours" value={`${formatHours(model.actualMin)} / ${formatHours(model.goalMin)}`} fill="fill-purple" pct={model.goalMin ? Math.min(100, (model.actualMin / model.goalMin) * 100) : 0} />
        <Stat className="g-orange" icon={<ListChecks size={16} />} label="Tasks" value={`${model.tasksDone} / ${model.tasksTotal}`} fill="fill-orange" pct={model.tasksTotal ? (model.tasksDone / model.tasksTotal) * 100 : 0} />
        <Stat className="g-red" icon={<Flame size={16} />} label="Streak" value={`${model.streak} Days`} fill="fill-red" pct={Math.min(100, model.streak * 8)} />
      </section>

      <section className="grid-3">
        <motion.article className="card lift" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card-head"><h3>Weekly Overview</h3><Link className="link" to="/reports">View Details →</Link></div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={model.week} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Completed']} contentStyle={{ background: '#16102c', border: '1px solid rgba(186,160,255,.3)', borderRadius: 12 }} />
                <Bar dataKey="value" radius={[10, 10, 6, 6]} maxBarSize={36}>
                  {model.week.map((entry) => (
                    <Cell key={entry.date} fill={BAR_COLORS[model.week.indexOf(entry) % BAR_COLORS.length]} />
                  ))}
                  <LabelList dataKey="value" position="top" formatter={(value) => `${value}%`} fill="#d6ccf0" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.article>
        <article className="card lift">
          <div className="card-head"><h3>Skill Progress</h3><Link className="link" to="/skills">View All →</Link></div>
          {skills.length === 0 ? <p className="muted">Add a skill to see a gap here.</p> : skills.map((skill, index) => {
            const Icon = skillIcon(skill.name);
            const color = SKILL_COLORS[index % SKILL_COLORS.length];
            return (
              <div key={skill.id} className="skill-row">
                <Icon size={16} color={color} />
                <div>
                  <b>{skill.name}</b>
                  <div className="skill-track"><span style={{ width: `${levelProgress(skill.currentLevel, skill.targetLevel)}%`, background: color }} /></div>
                </div>
                <span className="pct">{levelProgress(skill.currentLevel, skill.targetLevel)}%</span>
              </div>
            );
          })}
        </article>
        <article className="card lift">
          <div className="card-head"><h3>Today's Schedule</h3><Link className="link" to="/calendar">Calendar</Link></div>
          {model.schedule.length === 0 ? <p className="muted">Nothing is planned today. Generate a week in Smart Scheduler.</p> : model.schedule.slice(0, 6).map((block) => (
            <button key={block.id} className="time-row" type="button" onClick={() => completeBlock(block)} style={{ width: '100%', background: 'transparent', borderLeft: 0, borderRight: 0, borderTop: 0 }}>
              <span>{block.status === 'completed' ? <CheckCircle2 size={16} color="#34d399" /> : <Circle size={16} color="#22d3ee" />}</span>
              <span style={{ flex: 1, textAlign: 'left' }}><b>{block.start} – {block.end}</b><div className="muted">{block.title}</div></span>
            </button>
          ))}
        </article>
      </section>

      <section className="grid-4">
        <article className="card lift">
          <div className="card-head"><h3>Quick Tasks</h3><Link className="link" to="/tasks">Add Task +</Link></div>
          {quick.length === 0 ? <p className="muted">No tasks dated today.</p> : quick.map((task) => (
            <div key={task.id} className="check-row">
              <label>
                <input type="checkbox" checked={task.status === 'completed'} onChange={() => run(() => toggleTask(task))} />
                <span>{task.title}</span>
              </label>
              <span className={`pill p-${task.priority}`}>{task.priority}</span>
            </div>
          ))}
        </article>
        <article className="card lift">
          <div className="card-head"><h3><Heart size={16} color="#fb7185" /> Health & Fitness</h3><Link className="link" to="/health">View More →</Link></div>
          <div className="fit-row">
            <RingLite value={model.fitScore} label="Fitness" color="#34d399" caption="Goal" />
            <RingLite value={waterPct} label="Water" color="#38bdf8" icon={<Droplets size={14} />} caption={fit ? `${fit.waterGlasses}/${waterGoal}` : '—'} />
            <RingLite value={sleepPct} label="Sleep" color="#a78bfa" icon={<BedDouble size={14} />} caption={fit ? `${fit.sleepHours}h` : '—'} />
            <RingLite value={movePct} label="Exercise" color="#34d399" icon={<Dumbbell size={14} />} caption={fit ? `${fit.exerciseMin}m` : '—'} />
          </div>
        </article>
        <article className="card lift">
          <div className="card-head"><h3>Notifications</h3><Link className="link" to="/settings">View All →</Link></div>
          {(vault.notifications || []).slice(0, 4).map((item) => (
            <div key={item.id} className="notice"><Bell size={14} /><div><b>{item.title}</b><div className="muted">{item.body}</div></div></div>
          ))}
          {(vault.notifications || []).length === 0 ? <p className="muted">Alerts for due and overdue tasks appear here.</p> : null}
        </article>
        <article className="card dream">
          <div>
            <h3>Dream Big...</h3>
            <p>Learn Hard... Achieve More...</p>
            <p>{vault.profile.careerTarget || 'Set a career target in Profile.'}</p>
          </div>
          <Trophy color="#fbbf24" />
        </article>
      </section>

      <section className="dash-bottom">
        <article className="card lift">
          <div className="card-head">
            <h3><Smartphone size={16} /> Mobile Usage Tracker</h3>
            <span className={`pill ${mobile && mobile.totalMin > limit ? 'p-high' : 'p-low'}`}>{mobile && mobile.totalMin <= limit ? 'On Track!' : mobile ? 'Over limit' : 'Not logged'}</span>
          </div>
          <strong className="usage-figure">{mobile ? minutesToLabel(mobile.totalMin) : '—'} <span>/ {minutesToLabel(limit)}</span></strong>
          <div className="bar" style={{ marginTop: 8 }}><span className={mobile && mobile.totalMin > limit ? 'fill-red' : 'fill-green'} style={{ width: `${mobile ? Math.min(100, (mobile.totalMin / limit) * 100) : 0}%` }} /></div>
          <p className="muted">Entered by you. This browser cannot read your phone's screen time.</p>
        </article>
        <article className="card lift">
          <div className="card-head"><h3>Upcoming Goals</h3><Link className="link" to="/profile">View All →</Link></div>
          {goals.length === 0 ? <p className="muted">Add a goal on your profile.</p> : goals.slice(0, 4).map((goal) => (
            <div key={goal.id} className="goal-row"><span className="dot" style={{ background: '#22d3ee' }} /><div style={{ flex: 1 }}>{goal.title}</div><small className="muted">{goal.targetDate}</small></div>
          ))}
        </article>
        <article className="banner">
          <div>
            <strong><Star size={16} /> You are {model.progress}% on track this week!</strong>
            <p>{model.message}</p>
          </div>
          <TrendingUp size={42} color="#fde68a" />
        </article>
      </section>
    </div>
  );
}

function skillIcon(name) {
  const text = (name || '').toLowerCase();
  if (text.includes('react')) return Atom;
  if (text.includes('sql') || text.includes('mongo') || text.includes('data')) return Database;
  if (text.includes('python')) return Code2;
  if (text.includes('english') || text.includes('speak') || text.includes('communication')) return Headphones;
  if (text.includes('java')) return Coffee;
  return Braces;
}

function Stat({ className, icon, label, value, fill, pct }) {
  return (
    <article className={`card stat ${className}`}>
      <div className="stat-top"><span>{label}</span><span className="stat-ico" style={{ background: 'rgba(255,255,255,.12)' }}>{icon}</span></div>
      <div className="stat-value">{value}</div>
      <div className="bar"><span className={fill} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
    </article>
  );
}

function RingLite({ value, label, color, caption, icon }) {
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <div className="ring-label">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r={radius} stroke="rgba(148,130,190,.35)" strokeWidth="6" fill="none" />
        <circle cx="36" cy="36" r={radius} stroke={color} strokeWidth="6" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 36 36)" />
      </svg>
      <div className="ring-center">{icon || <strong>{Math.round(value)}%</strong>}</div>
      <div>{label}</div>
      <strong>{caption}</strong>
    </div>
  );
}

function Robot() {
  return (
    <svg width="92" height="108" viewBox="0 0 92 108" aria-hidden="true">
      <ellipse cx="46" cy="100" rx="24" ry="6" fill="rgba(34,211,238,.35)" />
      <rect x="22" y="28" width="48" height="40" rx="16" fill="#e0f2fe" stroke="#22d3ee" />
      <circle cx="38" cy="46" r="4" fill="#312e81" />
      <circle cx="54" cy="46" r="4" fill="#312e81" />
      <path d="M40 56h12" stroke="#312e81" strokeWidth="2" strokeLinecap="round" />
      <rect x="40" y="14" width="12" height="12" rx="4" fill="#8b5cf6" />
      <circle cx="46" cy="12" r="4" fill="#22d3ee" />
      <path d="M70 40c10 2 14 10 12 18" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" />
      <circle cx="80" cy="62" r="5" fill="#fbbf24" />
      <rect x="30" y="70" width="32" height="22" rx="10" fill="#6366f1" />
    </svg>
  );
}
