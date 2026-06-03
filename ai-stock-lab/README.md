# 🧪 AI Stock Lab

A **local-first** tool to log dated stock picks from different AI models / prompts as virtual
portfolios, then track how each one performs over time — so you can find the AI + prompt that
actually works *before* putting real money on it.

> For research only. Not financial advice.

## What it does

- Log a **portfolio** for each AI suggestion: the **model**, the **prompt** (and/or a **link** to
  the conversation), the **date/time** of the answer, and the **tickers, entry prices and amounts**
  you'd allocate based on its recommendation.
- See every portfolio on a **leaderboard ranked by return %**, with a value sparkline.
- Open a portfolio for a positions breakdown, an editable current price per position, and a
  **value-over-time chart** that builds up as you refresh prices.
- Compare 10+ AI/prompt experiments side by side, then reuse the winner.

Everything is stored **in your browser** (localStorage). No backend, no account, no API keys.

## Run it

```bash
cd ai-stock-lab
npm install
npm run dev          # open http://localhost:3000
```

Other scripts:

```bash
npm run build        # type-check + production build
npm run preview      # serve the production build (prices still work via the proxy)
npm test             # unit tests for the return math
```

## Prices (free, no API key)

Auto-pricing uses **Yahoo Finance's public quote endpoint**. Browsers can't call it directly
(CORS), so requests go through a small proxy defined in `vite.config.ts` at `/api/yf`. That proxy
exists while running `npm run dev` or `npm run preview`, which is the intended way to use the app.

- Click **Refresh prices** to pull the latest quotes and append a daily snapshot to each chart.
- Use the **⟳** button next to a position's entry price to auto-fill it.
- Any current price can be **overridden manually** in the portfolio table — and manual entry is the
  fallback if the network/endpoint is unavailable or you deploy the app as a fully static page.

Tickers use Yahoo symbology: US stocks `AAPL`, Euronext Paris `MC.PA`, crypto `BTC-USD`, etc.
You can log **any** ticker; the built-in list is just autocomplete.

## How returns are computed

Each position's return comes from its price **ratio** (`current ÷ entry`), which is
currency-agnostic — so a single portfolio can safely mix a USD stock and a EUR stock. A portfolio's
value is the sum of each invested amount grown by its own return; positions without a known current
price stay flat until you price them.

## Backups

Data lives only in this browser. In **Settings** you can **export** a JSON backup and **import** it
on another browser/machine. Exporting regularly is recommended.

## Tech

React + TypeScript + Vite + Tailwind + Zustand (persisted to localStorage). No external runtime
services. Self-contained in this folder; it doesn't touch the rest of the repository.
