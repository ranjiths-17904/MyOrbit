import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// import { OrbitField } from '../components/OrbitField.jsx';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
};

export function LandingPage() {
  return (
    <section className="gate-hero">
      {/* <OrbitField /> */}
      <div className="gate-stage">
        <motion.div className="gate-copy" initial="hidden" animate="show" variants={rise}>
          <p className="gate-kicker"><span className="status-dot" /> Your personal planning space</p>
          <h1>Make room for what <span>moves you forward.</span></h1>
          <p className="gate-description">Bring learning, tasks, health, and screen time into one clear weekly plan. Your schedule changes when you say it’s ready.</p>
          <div className="row-actions gate-actions">
            <Link className="btn" to="/login">Get started <span aria-hidden="true">→</span></Link>
            <Link className="btn-ghost" to="/about">Explore MyOrbit</Link>
          </div>
          <div className="gate-highlights" aria-label="MyOrbit features">
            <span><strong>01</strong> Plan your week</span>
            <span><strong>02</strong> Track your progress</span>
            <span><strong>03</strong> Adjust with intention</span>
          </div>
        </motion.div>
        <motion.div className="gate-visual" initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, ease: 'easeOut', delay: .12 }}>
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core"><span>MY</span><strong>ORBIT</strong></div>
          <div className="visual-caption"><span className="status-dot" /> YOUR WEEK, IN BALANCE</div>
        </motion.div>
      </div>
    </section>
  );
}
