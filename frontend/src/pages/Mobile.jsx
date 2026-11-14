import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { todayISO, minutesToLabel } from '../lib/dates.js';
import { weekSeries } from '../lib/metrics.js';
import { Field, Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

export function MobilePage() {
  const { vault, saveMobile, updateProfile } = useStore();
  const run = useAction();
  const today = todayISO();
  const limit = Number(vault.profile.mobileLimitMinutes) || 120;
  const existing = (vault.mobile || []).find((row) => row.date === today) || { totalMin: 0, socialMin: 0, entertainmentMin: 0, productiveMin: 0, note: '' };
  const series = weekSeries(vault.mobile, 'totalMin');

  const save = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const totalMin = Number(data.get('totalMin') || 0);
    run(() => saveMobile({
      date: today,
      totalMin,
      socialMin: Number(data.get('socialMin') || 0),
      entertainmentMin: Number(data.get('entertainmentMin') || 0),
      productiveMin: Number(data.get('productiveMin') || 0),
      note: data.get('note')
    }), totalMin > limit ? `Saved. ${minutesToLabel(totalMin)} is over your ${minutesToLabel(limit)} limit.` : 'Mobile log saved.');
  };

  return (
    <Page title="Mobile usage" subtitle="Type the numbers from your phone's own screen-time screen. A normal website cannot read that total by itself.">
      <div className="split">
        <form className="card" onSubmit={save}>
          <h3>Today, entered manually</h3>
          <Field label="Total minutes"><input name="totalMin" type="number" min="0" max="1440" required defaultValue={existing.totalMin} /></Field>
          <Field label="Social"><input name="socialMin" type="number" min="0" defaultValue={existing.socialMin || 0} /></Field>
          <Field label="Entertainment"><input name="entertainmentMin" type="number" min="0" defaultValue={existing.entertainmentMin || 0} /></Field>
          <Field label="Productive"><input name="productiveMin" type="number" min="0" defaultValue={existing.productiveMin || 0} /></Field>
          <Field label="Note"><input name="note" defaultValue={existing.note || ''} /></Field>
          <button className="btn" type="submit">Save log</button>
          {existing.totalMin > limit ? <p className="warn">Today is over the limit you set.</p> : <p className="ok-text">Inside the current limit, or not logged yet.</p>}
        </form>
        <article className="card">
          <h3>This week</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <XAxis dataKey="label" stroke="currentColor" tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#22d3ee" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Field label="Daily limit (minutes)">
            <input type="number" min="15" max="600" defaultValue={limit} onBlur={(event) => run(() => updateProfile({ ...vault.profile, mobileLimitMinutes: Number(event.target.value) }), 'Limit updated.')} />
          </Field>
        </article>
      </div>
    </Page>
  );
}
