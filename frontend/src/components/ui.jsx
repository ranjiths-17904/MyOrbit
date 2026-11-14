import { useEffect } from 'react';
import { useStore } from '../store/Store.jsx';

export function useAction() {
  const { toast } = useStore();
  return async (fn, ok) => {
    try {
      await fn();
      if (ok) toast(ok);
      return true;
    } catch (error) {
      toast(error.message || 'Something went wrong.', 'error');
      return false;
    }
  };
}

export function Field({ label, children, full }) {
  return (
    <label className={`field ${full ? 'full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h3>{title}</h3>
          <button className="btn-ghost" type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Ring({ value, size = 92, color = '#34d399' }) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, value)) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="46" cy="46" r={radius} stroke="rgba(255,255,255,.12)" strokeWidth="8" fill="none" />
      <circle className="progress-ring" cx="46" cy="46" r={radius} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="46" y="50" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="700" transform="rotate(90 46 46)">{Math.round(value)}%</text>
    </svg>
  );
}

export function Feedback() {
  const { toasts, confirmState, setConfirmState } = useStore();
  return (
    <>
      <div className="toasts">
        {toasts.map((item) => (
          <div key={item.id} className={`toast ${item.type}`} role="status">{item.message}</div>
        ))}
      </div>
      {confirmState && (
        <Modal title={confirmState.title || 'Please confirm'} onClose={() => { confirmState.resolve(false); setConfirmState(null); }}>
          <p>{confirmState.message}</p>
          <div className="row-actions">
            <button className="btn-danger" type="button" onClick={() => { confirmState.resolve(true); setConfirmState(null); }}>{confirmState.confirmLabel || 'Delete'}</button>
            <button className="btn-ghost" type="button" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Priority({ value }) {
  return <span className={`pill p-${value || 'medium'}`}>{value || 'medium'}</span>;
}

export function Page({ title, subtitle, actions, children }) {
  return (
    <section>
      <div className="page-title">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="row-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="muted">{children}</p>;
}
