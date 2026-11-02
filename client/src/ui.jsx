export const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
export const cLab = (c) => (c >= 75 ? "High" : c >= 55 ? "Medium" : "Low");
export const cCol = (c) => (c >= 75 ? "var(--h)" : c >= 55 ? "#e0a100" : "var(--warn)");

export function Confidence({ value, note }) {
  const c = clamp(value, 0, 100);
  return (
    <div className="conf">
      <div className="top"><span>Confidence: {cLab(c)}</span><span>{Math.round(c)}%</span></div>
      <div className="trk"><div className="fill" style={{ width: c + "%", background: cCol(c) }} /></div>
      {note && <p>{note}</p>}
    </div>
  );
}

export function Spinner({ children }) {
  return <><span className="spin" />{children}</>;
}
