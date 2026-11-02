# Match Oracle

AI football analysis. Paste a slip to see which picks to **play**, which are **risky** and which to **skip**, each with a confidence level. Or analyze a single match.

- **Frontend:** React 18 + Vite (`client/`)
- **Backend:** Node + Express, calls the Anthropic API (`server/`). Your API key never reaches the browser.

## Run it

Requires Node 18+.

```bash
npm install
cp server/.env.example server/.env   # then put your ANTHROPIC_API_KEY in it
npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to the server on port 3001).

## Production

```bash
npm run build   # builds client/dist
npm start       # serves the API and the built app on http://localhost:3001
```

## Structure

```
server/index.js            API routes + prompts (/api/slip, /api/match)
client/src/App.jsx         tabs
client/src/SlipAnalyzer.jsx    paste a slip, batched analysis, Play/Risky/Skip
client/src/MatchPredictor.jsx  single match prediction
client/src/parseSlip.js    turns pasted slip text into structured picks
client/src/api.js          fetch helpers
```

## Notes

- The model works from general knowledge, not live odds, form or injuries. Use the “Extra info” boxes to supply fresh news.
- Each slip batch (12 picks) is one API call. Change `BATCH` in `SlipAnalyzer.jsx` to tune it.
- Before putting this on the public internet, add rate limiting and some form of login, or anyone can spend your API credit.
- Change the model with `MODEL=` in `server/.env`.
