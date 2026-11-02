import { useState } from "react";
import SlipAnalyzer from "./SlipAnalyzer.jsx";
import MatchPredictor from "./MatchPredictor.jsx";

export default function App() {
  const [tab, setTab] = useState("slip");
  return (
    <div className="wrap">
      <h1>⚽ Match Oracle</h1>
      <p className="sub">Paste your picks to see what to play and what to skip, or analyze a single match. Every call comes with a confidence level.</p>
      <div className="tabs" role="tablist">
        <button className={tab === "slip" ? "on" : ""} onClick={() => setTab("slip")}>Analyze my slip</button>
        <button className={tab === "match" ? "on" : ""} onClick={() => setTab("match")}>Single match</button>
      </div>
      {/* Both stay mounted so results survive switching tabs */}
      <div hidden={tab !== "slip"}><SlipAnalyzer /></div>
      <div hidden={tab !== "match"}><MatchPredictor /></div>
      <p className="foot">Predictions are estimates from an AI’s general knowledge, not live data or guarantees. Never stake money you can’t afford to lose. 18+ only.</p>
    </div>
  );
}
