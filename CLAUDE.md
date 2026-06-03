# CLAUDE.md — AI Stock Lab

Guidance for AI assistants working in this repository.

## What this is

AI Stock Lab is a **local-first** web app for logging dated stock-pick suggestions from different
AI models / prompts as virtual portfolios, then tracking how each performs over time — to find the
AI + prompt that actually works before risking real money.

There is **no backend, no account, no API keys**. All data lives in the browser (localStorage, via
a persisted Zustand store). Prices come from Yahoo Finance's public endpoint through a Vite
dev/preview proxy.

> Research tool only — not financial advice.

## Tech stack

| Layer | Tech |
|-------|------|
| UI | React 18 + TypeScript 5 (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 |
| State | Zustand 4 (persisted to localStorage) |
| Routing | react-router-dom 6 |
| Tests | Vitest |

## Commands

```bash
npm install
npm run dev      # http://localhost:3000 (price proxy active)
npm run build    # tsc type-check + vite build
npm run preview  # serve the production build (proxy active)
npm test         # vitest run
```

## Project structure

```
src/
  main.tsx, App.tsx        # entry + router
  index.css                # Tailwind directives + component classes (dark theme)
  types.ts                 # Portfolio, Position, PriceQuote, SnapshotPoint, Settings
  data/stocks.ts           # ticker autocomplete data + AI model list + currencies
  lib/
    calc.ts                # return math (position / portfolio / leaderboard)
    calc.test.ts           # unit tests for calc
    format.ts              # currency / percent / date formatting
  services/prices.ts       # Yahoo Finance fetch via the /api/yf proxy
  store/useStore.ts        # Zustand store: portfolios, prices, snapshots, settings
  components/              # Layout, Sparkline, LineChart, TickerInput, PositionsEditor, ReturnText
  pages/                   # Dashboard, PortfolioForm, PortfolioDetail, Settings
vite.config.ts             # includes the /api/yf -> Yahoo Finance proxy
```

## Key concepts

- **Returns are ratio-based.** Each position's return is `current / entry`, which is
  currency-agnostic — so a portfolio can mix a USD stock and a EUR stock safely. Portfolio value is
  the sum of each invested amount grown by its own ratio; unpriced positions stay flat. See
  `src/lib/calc.ts` (unit-tested in `calc.test.ts`).
- **Prices.** `src/services/prices.ts` calls `/api/yf/...`, proxied to
  `query1.finance.yahoo.com` in `vite.config.ts` (dev + preview only). A per-position
  `manualCurrentPrice` is always available as a fallback.
- **Persistence.** The store persists to localStorage under key `ai-stock-lab`. Daily `snapshots`
  per portfolio drive the value-over-time charts. JSON export/import lives on the Settings page.

## Conventions

- TypeScript strict; `noUnusedLocals` / `noUnusedParameters` are on — keep imports and vars used.
- Use `import type` for type-only imports.
- Tailwind component classes (`btn`, `card`, `input`, `badge-*`) are defined in `src/index.css`.
- Tickers use Yahoo symbology (e.g. `AAPL`, `MC.PA`, `BTC-USD`).
- Put pure logic in `src/lib` and add Vitest tests there for new math.

## CI

`.github/workflows/ci.yml` type-checks, builds and runs the tests on every push and pull request.
