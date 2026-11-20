export function OrbitLoader({ label = 'Aligning your orbit' }) {
  return (
    <div className="orbit-loader" role="status" aria-live="polite">
      <div className="orbit-stage" aria-hidden="true">
        <span className="planet" />
        <span className="ring r1"><i /></span>
        <span className="ring r2"><i /></span>
        <span className="ring r3"><i /></span>
      </div>
      <p>{label}</p>
    </div>
  );
}
