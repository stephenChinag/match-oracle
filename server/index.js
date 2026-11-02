import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json({ limit: "100kb" }));

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const MODEL = process.env.MODEL || "claude-sonnet-5-5";
const str = (v, n = 200) => String(v ?? "").slice(0, n);

async function askJson(prompt) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("The model returned no JSON.");
  return JSON.parse(text.slice(s, e + 1));
}

// Analyze up to 15 picks from a slip
app.post("/api/slip", async (req, res, next) => {
  try {
    const picks = Array.isArray(req.body.picks) ? req.body.picks.slice(0, 15) : [];
    if (!picks.length) return res.status(400).json({ error: "No picks provided." });
    const ctx = str(req.body.context, 1500) || "none";
    const lines = picks
      .map((p) => `#${Number(p.id)} | ${str(p.when, 20)} | ${str(p.home)} vs ${str(p.away)} | Market: ${str(p.market)} | Pick: ${str(p.pick)} | Odds: ${Number(p.odds) || "?"}`)
      .join("\n");
    const prompt = `You are a disciplined football betting analyst reviewing picks from a slip. Today is ${new Date().toDateString()}; your own knowledge may be out of date, so be humble about form and injuries.
User-supplied context (freshest info, overrides memory): ${ctx}
Market glossary: Double Chance = either of two outcomes. "1X2 - 1UP" / "2UP" = early payout: the bet wins if the picked team leads by 1 (1UP) or 2 (2UP) goals at ANY point, otherwise it settles on the final result. "Handicap 0:1" = away team starts with a 1-goal head start (so Home (0:1) needs a home win by 2+); "0:2" = away starts 2 up (so Away (0:2) wins unless home wins by 3+). "Away Team to Win to Nil: No" = the away team does NOT win while keeping a clean sheet.
For each pick estimate the true probability it wins (prob, 0-100). Compare with the odds-implied probability (100/odds). PLAY only if your prob clearly beats the implied probability AND you are fairly sure; RISKY if it is close or uncertain; SKIP if your prob is below implied, the matchup is volatile (rotation, derbies, European away trips), or you don't know the teams. Be selective: fewer than 40% of picks should be PLAY. "confidence" (0-100) = how sure you are of your estimate (lower for stale data or unknown teams).
Picks:
${lines}
Respond ONLY with JSON: {"results":[{"id":number,"prob":number,"confidence":number,"verdict":"PLAY"|"RISKY"|"SKIP","reason":string (one sentence)}]}`;
    res.json(await askJson(prompt));
  } catch (err) { next(err); }
});

// Analyze a single match
app.post("/api/match", async (req, res, next) => {
  try {
    const { home, away } = req.body;
    if (!home || !away) return res.status(400).json({ error: "Both teams are required." });
    const prompt = `You are a careful football (soccer) analyst. Analyze this match.
Home: ${str(home, 80)}. Away: ${str(away, 80)}. Competition: ${str(req.body.competition, 80) || "unknown"}. Date: ${str(req.body.date, 40) || "unknown"}.
User-supplied context (treat as the freshest information, it overrides your memory): ${str(req.body.context, 1500) || "none provided"}
Today is ${new Date().toDateString()}; your own knowledge may be out of date, so say so in the confidence note when no context was given.
Be calibrated: don't give extreme probabilities; draws are common; confidence in a play must never exceed your true belief.
Respond with ONLY JSON (no markdown):
{"homeWin":number,"draw":number,"awayWin":number (percent, sum to 100),
"predictedScore":"x-y","matchRating":number 0-10 (how good/competitive/entertaining the fixture should be),
"predictability":number 0-10 (10 = very one-sided),
"summary":string (2 sentences),
"factors":[4 short strings, key factors],
"plays":[4 or 5 objects {"market":string,"pick":string,"confidence":number 0-100,"risk":"Safe"|"Medium"|"Risky","reason":string (one sentence)}] sorted best first, covering varied markets (result, double chance, goals over/under, both teams to score),
"overallConfidence":number 0-100,"confidenceNote":string (one sentence on what limits certainty),
"knownTeams":boolean}
If you don't recognize a team, set knownTeams false and keep confidence below 30.`;
    res.json(await askJson(prompt));
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "The analysis failed. Check the server log and your API key." });
});

// In production, serve the built React app
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Match Oracle server on http://localhost:${port}`));
