import { useState } from "react";
import { analyzeMatch } from "./api.js";
import { clamp, cLab, cCol, Confidence, Spinner } from "./ui.jsx";

const RISK = { Safe: "#0a9d58", Medium: "#c98a00", Risky: "#d9480f" };

export default function MatchPredictor() {
  const [f, setF] = useState({ home: "", away: "", competition: "", date: "", context: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [r, setR] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function run() {
    if (!f.home.trim() || !f.away.trim()) { setError("Enter both teams."); return; }
    setError(""); setR(null); setBusy(true);
    try { setR({ ...(await analyzeMatch(f)), m: { ...f } }); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }

  let H = 0, D = 0, A = 0;
  if (r) {
    H = clamp(r.homeWin, 0, 100); D = clamp(r.draw, 0, 100); A = clamp(r.awayWin, 0, 100);
    const t = H + D + A || 1;
    H = Math.round(H / t * 100); D = Math.round(D / t * 100); A = 100 - H - D;
  }

  return (
    <section>
      <div className="card">
        <div className="vs">
          <div><label htmlFor="home">Home team</label><input id="home" value={f.home} onChange={set("home")} placeholder="e.g. Arsenal" /></div>
          <span>vs</span>
          <div><label htmlFor="away">Away team</label><input id="away" value={f.away} onChange={set("away")} placeholder="e.g. Chelsea" /></div>
        </div>
        <div className="row">
          <div><label htmlFor="comp">Competition (optional)</label><input id="comp" value={f.competition} onChange={set("competition")} placeholder="Premier League, UCL…" /></div>
          <div><label htmlFor="date">Match date (optional)</label><input id="date" value={f.date} onChange={set("date")} placeholder="e.g. 8 Nov 2026" /></div>
        </div>
        <label htmlFor="mctx">Extra info (optional, but it improves the analysis)</label>
        <textarea id="mctx" value={f.context} onChange={set("context")} placeholder="Recent form, injuries or suspensions, head-to-head, odds you’re seeing…" />
        <button className="go" onClick={run} disabled={busy}>{busy ? <Spinner>Analyzing…</Spinner> : "Analyze match"}</button>
      </div>

      {error && <div className="err">{error}</div>}

      {r && (
        <>
          <div className="card hdr">
            <h2>{r.m.home} <span className="meta">vs</span> {r.m.away}</h2>
            <div className="meta">Predicted score</div>
            <div className="big">{r.predictedScore}</div>
            <div className="stack">
              <div style={{ flex: H, background: "var(--h)" }} />
              <div style={{ flex: D, background: "var(--d)" }} />
              <div style={{ flex: A, background: "var(--a)" }} />
            </div>
            <div className="leg">
              <span style={{ color: "var(--h)" }}>{r.m.home} {H}%</span>
              <span style={{ color: "var(--d)" }}>Draw {D}%</span>
              <span style={{ color: "var(--a)" }}>{r.m.away} {A}%</span>
            </div>
            <div className="rate">
              <div><b>{clamp(r.matchRating, 0, 10).toFixed(1)}</b><span className="meta">Match rating</span></div>
              <div><b>{clamp(r.predictability, 0, 10).toFixed(1)}</b><span className="meta">Predictability</span></div>
            </div>
            <p className="left top12">{r.summary}</p>
            <Confidence value={r.overallConfidence} note={r.confidenceNote} />
          </div>

          <div className="card">
            <h3>Key factors</h3>
            <ul>{(r.factors || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>

          <div className="card">
            <h3>Suggested plays</h3>
            {(r.plays || []).map((p, i) => {
              const c = clamp(p.confidence, 0, 100);
              const risk = RISK[p.risk] ? p.risk : "Medium";
              return (
                <div key={i} className={"pick" + (i === 0 ? " best" : "")}>
                  <div className="pt">
                    <div><div className="mk">{i === 0 ? "⭐ Top pick · " : ""}{p.market}</div><div className="pn">{p.pick}</div></div>
                    <span className="pill" style={{ background: RISK[risk] }}>{risk}</span>
                  </div>
                  <div className="cmp"><span>Confidence: {cLab(c)}</span><span>{Math.round(c)}%</span></div>
                  <div className="trk"><div className="fill" style={{ width: c + "%", background: cCol(c) }} /></div>
                  <p className="why">{p.reason}</p>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p className="warn">
              {r.knownTeams === false && "One or both teams weren’t recognized, so treat this as a rough guess. "}
              Football is unpredictable: even a “High” confidence play can lose. This is analysis, not betting advice.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
