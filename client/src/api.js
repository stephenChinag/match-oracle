async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const analyzeSlip = (picks, context) => post("/api/slip", { picks, context });
export const analyzeMatch = (match) => post("/api/match", match);
