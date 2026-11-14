import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { addDays, startOfWeek, todayISO } from '../lib/dates.js';
import { buildReport, formatHours, toCsv } from '../lib/metrics.js';
import { Page } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function ReportsPage() {
  const { vault } = useStore();
  const weekStart = startOfWeek(todayISO());
  const report = buildReport(vault, weekStart);
  const weeks = [3, 2, 1, 0].map((offset) => {
    const start = addDays(weekStart, -7 * offset);
    const item = buildReport(vault, start);
    return { label: start.slice(5), hours: Math.round((item.actual / 60) * 10) / 10 };
  });

  const download = () => {
    const blob = new Blob([toCsv(report)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `myorbit-${report.weekStart}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page title="Reports" subtitle="Numbers come from blocks and logs you saved. Use Print and choose Save as PDF." actions={<><button className="btn" type="button" onClick={download}>Download CSV</button><button className="btn-ghost" type="button" onClick={() => window.print()}>Print / PDF</button></>}>
      <section className="stats">
        <article className="card"><h3>Study</h3><div className="stat-value">{formatHours(report.actual)}</div><p className="muted">of {formatHours(report.planned)} planned</p></article>
        <article className="card"><h3>Tasks</h3><div className="stat-value">{report.tasksCompleted}</div><p className="muted">{report.tasksMissed} still open this week</p></article>
        <article className="card"><h3>Fitness</h3><div className="stat-value">{report.fitnessAverage}%</div><p className="muted">average of logged days</p></article>
        <article className="card"><h3>Mobile</h3><div className="stat-value">{formatHours(report.mobileTotal)}</div><p className="muted">entered this week</p></article>
      </section>
      <div className="split">
        <article className="card">
          <h3>Finished study hours</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks}>
                <XAxis dataKey="label" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="card">
          <h3>Skills this week</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Skill</th><th>Level</th><th>Minutes done</th></tr></thead>
              <tbody>
                {report.skills.map((skill) => (
                  <tr key={skill.name}><td>{skill.name}</td><td>{skill.currentLevel} → {skill.targetLevel}</td><td>{skill.minutes}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Coding and practice {formatHours(report.codingMinutes)}. Projects {formatHours(report.projectMinutes)}. English {formatHours(report.englishMinutes)}.</p>
          {(vault.reports || []).length ? <p className="muted">{vault.reports.length} approved weekly review{vault.reports.length === 1 ? '' : 's'} kept.</p> : <p className="muted">Approve a generated week to keep a review snapshot.</p>}
        </article>
      </div>
    </Page>
  );
}
