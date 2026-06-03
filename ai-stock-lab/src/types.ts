// ============================================================
// AI Stock Lab — core data model
// Everything lives client-side (localStorage via the Zustand store).
// ============================================================

/** A single stock/crypto/ETF position inside an AI's suggested portfolio. */
export interface Position {
  id: string;
  /** Yahoo Finance symbol, e.g. "AAPL", "MC.PA", "BTC-USD". */
  ticker: string;
  /** Optional human label, e.g. "Apple Inc.". */
  label?: string;
  /** Price per share/unit at the moment the suggestion was logged. */
  entryPrice: number;
  /** Virtual money allocated to this position (in the portfolio's base currency). */
  amountInvested: number;
  /** Optional manual override for the current price (used if set, else the live quote). */
  manualCurrentPrice?: number;
  /** Optional free-text note on why this pick was made. */
  rationale?: string;
}

/** One AI suggestion recorded as a dated virtual portfolio. */
export interface Portfolio {
  id: string;
  name: string;
  /** The AI model used, e.g. "Claude Opus 4.8", "GPT-5", "Gemini 2.5 Pro". */
  aiModel: string;
  /** Optional provider, e.g. "Anthropic", "OpenAI", "Google". */
  aiProvider?: string;
  /** The full prompt used to obtain the suggestion. */
  promptText?: string;
  /** A link to the conversation/source (shared chat URL, article, etc.). */
  sourceLink?: string;
  /** Optional pasted AI answer / reasoning. */
  answerText?: string;
  /** Display currency for the invested amounts (returns are currency-agnostic). */
  baseCurrency: string;
  /** When the AI produced the answer (user-provided). ISO string. */
  suggestedAt: string;
  /** When this record was created. ISO string. */
  createdAt: string;
  /** Last edit time. ISO string. */
  updatedAt: string;
  /** Archived portfolios are hidden from the main leaderboard and skipped on refresh. */
  archived?: boolean;
  notes?: string;
  positions: Position[];
}

/** A cached price quote for one ticker. */
export interface PriceQuote {
  ticker: string;
  price: number;
  currency?: string;
  /** When the quote was observed. ISO string. */
  asOf: string;
  source: 'yahoo' | 'manual';
}

/** One point in a portfolio's value history (one per calendar day). */
export interface SnapshotPoint {
  /** YYYY-MM-DD */
  date: string;
  value: number;
  invested: number;
  returnPct: number;
}

export interface Settings {
  /** Whether to attempt automatic price fetching (vs. manual only). */
  autoPrices: boolean;
  /** Default base currency for new portfolios. */
  defaultCurrency: string;
}

// ---- Inputs (ids/timestamps are filled in by the store) ----

export type PositionInput = Omit<Position, 'id'> & { id?: string };

export interface PortfolioInput {
  name: string;
  aiModel: string;
  aiProvider?: string;
  promptText?: string;
  sourceLink?: string;
  answerText?: string;
  baseCurrency: string;
  suggestedAt: string;
  notes?: string;
  positions: PositionInput[];
}
