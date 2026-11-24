import { Link } from 'react-router-dom';

const STEPS = [
  ['Tell us about you', 'Age, weight, height, wake time, and the hours you can actually study.'],
  ['Share interests and goals', 'Career target and topics such as web, Java, data, or interviews decide the stack.'],
  ['Generate the routine', 'Water, movement, sleep, phone limits, habits, skills, and starter tasks are filled in for you.'],
  ['Approve the week', 'The draft stays a draft until you approve it. Completed work is never invented.']
];

export function AboutPage() {
  return (
    <section className="gate-page">
      <p className="gate-kicker">About</p>
      <h1>A routine that starts from your life.</h1>
      <p className="lede">MyOrbit plans learning, health habits, and screen time from the details you enter. You do not have to build the first task list by hand.</p>
      <div className="gate-grid">
        {STEPS.map(([title, body]) => (
          <article key={title} className="gate-card">
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <h2>What the generator will and will not do</h2>
      <div className="gate-grid">
        <article className="gate-card">
          <h2>It will</h2>
          <p>Suggest a general water target, a short movement session, a phone limit, and a technology stack that matches your interests. Health numbers stay modest, with a lighter plan under 18 and over 65.</p>
        </article>
        <article className="gate-card">
          <h2>It will not</h2>
          <p>Diagnose illness, prescribe treatment, or read your phone’s screen time. Log health and mobile use yourself. If you are injured or under a clinician’s care, keep the lighter option.</p>
        </article>
      </div>
      <div className="row-actions" style={{ marginTop: 22 }}>
        <Link className="btn" to="/login">Create your routine</Link>
        <Link className="btn-ghost" to="/">Back home</Link>
      </div>
    </section>
  );
}
