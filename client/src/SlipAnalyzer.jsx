import { useState } from "react";
import { parseSlip } from "./parseSlip.js";
import { analyzeSlip } from "./api.js";
import { clamp, cLab, Spinner } from "./ui.jsx";

const COLORS = { PLAY: "#0a9d58", RISKY: "#c98a00", SKIP: "#d9480f" };
const BATCH = 12;

function PickCard({ p }) {
  const prob = clamp(p.prob, 0, 100);
  const conf = clamp(p.confidence, 0, 100);
  const implied = p.odds ? Math.round(100 / p.odds) : 0;
  return (
    <div className="sp">
      <div className="pt">
        <div>
          <div className="mk">{p.when} · {p.market}</div>
          <div className="tm">{p.home} vs {p.away}</div>
          <div className="pn small">{p.pick} <span className="meta">@{p.odds || "?"}</span></div>
        </div>
        <span className="pill" style={{ background: COLORS[p.verdict] }}>{p.verdict}</span>
      </div>
      <div className="trk top8"><div className="fill" style={{ width: prob + "%", background: COLORS[p.verdict] }} /></div>
      <div className="cmp">
        <span>Est. win chance <b>{Math.round(prob)}%</b></span>
        <span>Odds imply {implied}%</span>
        <span>Confidence {cLab(conf)} ({Math.round(conf)}%)</span>
      </div>
      <p className="why">{p.reason}</p>
    </div>
  );
}

function Section({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="card">
      <h3>{title} ({items.length})</h3>
      {items.map((p) => <PickCard key={p.id} p={p} />)}
    </div>
  );
}

export default function SlipAnalyzer() {
  const [text, setText] = useState("");
  const [ctx, setCtx] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  async function run() {
    const picks = parseSlip(text);
    if (!picks.length) {
      setData(null);
      setError("No picks found. Paste the full list, including the Game ID, team, Pick and Market lines.");
      return;
    }
    setError(""); setData(null); setBusy(true); setProgress({ done: 0, total: picks.length });

    const batches = [];
    for (let i = 0; i < picks.length; i += BATCH) batches.push(picks.slice(i, i + BATCH));
    const byId = {};
    await Promise.all(batches.map(async (b) => {
      try {
        const r = await analyzeSlip(b, ctx);
        (r.results || []).forEach((x) => { byId[x.id] = x; });
      } catch { /* counted as missed below */ }
      setProgress((s) => ({ ...s, done: s.done + b.length }));
    }));

    const results = picks.filter((p) => byId[p.id]).map((p) => {
      const v = String(byId[p.id].verdict).toUpperCase();
      return { ...p, ...byId[p.id], verdict: COLORS[v] ? v : "RISKY" };
    });
    setBusy(false);
    if (!results.length) {
      setError("The analysis failed. Check that the server is running and your API key is set.");
      return;
    }
    const entries = (text.match(/Game ID:/gi) || []).length;
    setData({ results, missed: picks.length - results.length, ignored: entries - picks.length });
  }

  const group = (v) => (data ? data.results.filter((p) => p.verdict === v).sort((a, b) => b.prob - a.prob) : []);
  const play = group("PLAY"), risky = group("RISKY"), skip = group("SKIP");
  const core = play.slice(0, 6);
  const odds = core.reduce((a, p) => a * (p.odds || 1), 1);
  const chance = core.reduce((a, p) => a * clamp(p.prob, 0, 100) / 100, 1);

  return (
    <section>
      <div className="card">
        <label htmlFor="slip">Paste your picks / slip</label>
        <textarea id="slip" className="tall" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Paste the whole list here: date, Game ID, teams, Pick, Market and odds…" />
        <label htmlFor="ctx">Extra info (optional)</label>
        <textarea id="ctx" value={ctx} onChange={(e) => setCtx(e.target.value)}
          placeholder="Recent team news, injuries, suspensions, anything you know…" />
        <button className="go" onClick={run} disabled={busy}>
          {busy ? <Spinner>Analyzed {progress.done}/{progress.total}…</Spinner> : "Tell me what to play"}
        </button>
      </div>

      {error && <div className="err">{error}</div>}

      {data && (
        <>
          <div className="card">
            <div className="sg">
              <div><b style={{ color: COLORS.PLAY }}>{play.length}</b>Play</div>
              <div><b style={{ color: COLORS.RISKY }}>{risky.length}</b>Risky</div>
              <div><b style={{ color: COLORS.SKIP }}>{skip.length}</b>Skip</div>
            </div>
            {core.length ? (
              <>
                <h3>Core slip: your top {core.length} by win chance</h3>
                <p className="flush">Combined odds <b>{odds.toFixed(2)}</b> · estimated chance every leg wins <b>{Math.round(chance * 100)}%</b></p>
              </>
            ) : <p className="flush">Nothing on this list cleared the bar to be a clear play.</p>}
            <p className="warn top12">
              Each extra leg multiplies the risk, so stacking many “safe” picks still loses often. Shorter slips are usually smarter than long ones.
              {data.missed > 0 && ` ${data.missed} pick(s) couldn’t be analyzed; try again.`}
              {data.ignored > 0 && ` ${data.ignored} entry(ies) had no pick and were ignored.`}
            </p>
          </div>
          <Section title="✅ Play" items={play} />
          <Section title="⚠️ Risky" items={risky} />
          <Section title="🚫 Skip" items={skip} />
        </>
      )}
    </section>
  );
}
