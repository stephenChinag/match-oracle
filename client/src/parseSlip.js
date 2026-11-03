// Understands two slip layouts and returns { picks, total, suspended }
//  1) "Game ID" layout (date, Game ID, teams, Pick, Market)
//  2) Over/Under layout: "Over 150.5" / "Team A v Team B" / market line / odds (or "Suspended")

function parseGames(L) {
  const picks = [];
  let total = 0;
  for (let i = 0; i < L.length; i++) {
    if (!/^Game ID:/i.test(L[i])) continue;
    total++;
    const when = /\d\d\/\d\d \d\d:\d\d/.test(L[i - 1] || "") ? L[i - 1] : "";
    let j = i + 1;
    if (/^(not started|live|postponed|finished|ft)/i.test(L[j] || "")) j++;
    const next = L.findIndex((s, x) => x > i && /^Game ID:/i.test(s));
    const end = next < 0 ? L.length : next;
    const k = L.findIndex((s, x) => x > j && x < end && s === "Pick");
    const m = L.findIndex((s, x) => x > j && x < end && s === "Market");
    if (k < 0 || m < 0 || !L[k + 1] || !L[m + 1]) continue; // incomplete entry
    const odds = L[k + 1].match(/@\s*([\d.]+)/);
    picks.push({
      when,
      home: L[j],
      away: L[j + 1],
      pick: L[k + 1].replace(/@.*/, "").trim(),
      market: L[m + 1],
      odds: odds ? Number(odds[1]) : 0,
    });
  }
  return { picks, total };
}

function parseTotals(L) {
  const picks = [];
  let total = 0, suspended = 0;
  for (let i = 0; i < L.length - 1; i++) {
    if (!/^(Over|Under)\s+[\d.]+$/i.test(L[i])) continue;
    const teams = L[i + 1].split(/\s+vs?\.?\s+/i);
    if (teams.length < 2) continue;
    total++;
    const market = L[i + 2] || "", oddsLine = L[i + 3] || "";
    if (!/^Over\/Under/i.test(market)) continue; // incomplete entry
    if (/^suspended$/i.test(oddsLine)) { suspended++; continue; }
    if (!/^\d+(\.\d+)?$/.test(oddsLine)) continue; // incomplete entry
    picks.push({ when: "", home: teams[0].trim(), away: teams[1].trim(), pick: L[i], market, odds: Number(oddsLine) });
  }
  return { picks, total, suspended };
}

export function parseSlip(text) {
  const L = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const g = parseGames(L), t = parseTotals(L);
  const picks = [...g.picks, ...t.picks].map((p, i) => ({ ...p, id: i + 1 }));
  return { picks, total: g.total + t.total, suspended: t.suspended };
}
