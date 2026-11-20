const STEPS = [
  ['Make a plan', 'Bring your learning, tasks, health, and screen time together in one place.'],
  ['Start with your goals', 'Create an account and begin shaping a plan around what matters to you.'],
  ['Approve the week', 'After sign-in, Smart Scheduler builds a draft. Nothing replaces the live plan until you approve it.'],
  ['Mark what happened', 'Check off tasks, log water and sleep, and write screen time by hand. The next week uses those marks.']
];

export function AboutPage() {
  return (
    <section className="gate-page">
      <p className="gate-kicker">About</p>
      <h1>One orbit for the hours you actually have.</h1>
      <p className="lede">MyOrbit is a personal planner for learning, tasks, health, and screen time, designed to help you make steady progress without losing sight of your bigger goals.</p>
      <div className="gate-grid">
        {STEPS.map(([title, body]) => (
          <article key={title} className="gate-card">
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
