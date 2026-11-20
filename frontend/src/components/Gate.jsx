import { Link, NavLink } from 'react-router-dom';
import { Orbit } from 'lucide-react';

export function Gate({ children }) {
  return (
    <div className="gate">
      <header className="gate-header">
        <Link className="gate-brand" to="/" aria-label="MyOrbit home">
          <span className="gate-brand-mark"><Orbit size={19} aria-hidden="true" /></span>
          <span>MyOrbit</span>
        </Link>
        <nav className="gate-nav" aria-label="Site">
          <NavLink to="/" end>Main</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/login" className={({ isActive }) => (isActive ? 'login active' : 'login')}>Login</NavLink>
        </nav>
      </header>
      {children}
    </div>
  );
}
