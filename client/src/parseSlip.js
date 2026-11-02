// Turns a pasted slip into [{id, when, home, away, pick, market, odds}]
export function parseSlip(text) {
  const L = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const picks = [];
  for (let i = 0; i < L.length; i++) {
    if (!/^Game ID:/i.test(L[i])) continue;
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
      id: picks.length + 1,
      when,
      home: L[j],
      away: L[j + 1],
      pick: L[k + 1].replace(/@.*/, "").trim(),
      market: L[m + 1],
      odds: odds ? Number(odds[1]) : 0,
    });
  }
  return picks;
}
