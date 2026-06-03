import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Portfolio,
  PortfolioInput,
  Position,
  PositionInput,
  PriceQuote,
  Settings,
  SnapshotPoint,
} from '../types';
import { portfolioMetrics } from '../lib/calc';
import { fetchQuotes } from '../services/prices';

// ---- small helpers ----

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const nowIso = () => new Date().toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

function withPositionIds(positions: PositionInput[]): Position[] {
  return positions.map((p) => ({
    ...p,
    id: p.id || makeId(),
    ticker: p.ticker.trim().toUpperCase(),
  }));
}

const DEFAULT_SETTINGS: Settings = { autoPrices: true, defaultCurrency: 'USD' };

// ---- store shape ----

interface StoreState {
  portfolios: Portfolio[];
  prices: Record<string, PriceQuote>;
  snapshots: Record<string, SnapshotPoint[]>;
  settings: Settings;
  lastRefresh?: string;
  refreshing: boolean;
  refreshError?: string;

  addPortfolio: (input: PortfolioInput) => Portfolio;
  updatePortfolio: (id: string, patch: Partial<PortfolioInput>) => void;
  deletePortfolio: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  setManualPrice: (portfolioId: string, positionId: string, price?: number) => void;

  mergeQuotes: (quotes: Record<string, PriceQuote>) => void;
  refreshPrices: (ids?: string[]) => Promise<{ updated: number; errors: string[] }>;
  captureSnapshots: () => void;

  setSettings: (patch: Partial<Settings>) => void;
  importData: (raw: string) => { ok: boolean; error?: string };
  exportData: () => string;
  clearAll: () => void;
  seedSample: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      portfolios: [],
      prices: {},
      snapshots: {},
      settings: DEFAULT_SETTINGS,
      lastRefresh: undefined,
      refreshing: false,
      refreshError: undefined,

      addPortfolio: (input) => {
        const portfolio: Portfolio = {
          id: makeId(),
          name: input.name.trim(),
          aiModel: input.aiModel.trim(),
          aiProvider: input.aiProvider?.trim() || undefined,
          promptText: input.promptText?.trim() || undefined,
          sourceLink: input.sourceLink?.trim() || undefined,
          answerText: input.answerText?.trim() || undefined,
          baseCurrency: input.baseCurrency || 'USD',
          suggestedAt: input.suggestedAt || nowIso(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          notes: input.notes?.trim() || undefined,
          positions: withPositionIds(input.positions),
        };
        set((s) => ({ portfolios: [portfolio, ...s.portfolios] }));
        get().captureSnapshots();
        return portfolio;
      },

      updatePortfolio: (id, patch) => {
        set((s) => ({
          portfolios: s.portfolios.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              ...patch,
              aiProvider: patch.aiProvider !== undefined ? patch.aiProvider?.trim() || undefined : p.aiProvider,
              positions: patch.positions ? withPositionIds(patch.positions) : p.positions,
              updatedAt: nowIso(),
            };
          }),
        }));
        get().captureSnapshots();
      },

      deletePortfolio: (id) => {
        set((s) => {
          const snapshots = { ...s.snapshots };
          delete snapshots[id];
          return { portfolios: s.portfolios.filter((p) => p.id !== id), snapshots };
        });
      },

      setArchived: (id, archived) => {
        set((s) => ({
          portfolios: s.portfolios.map((p) => (p.id === id ? { ...p, archived, updatedAt: nowIso() } : p)),
        }));
      },

      setManualPrice: (portfolioId, positionId, price) => {
        set((s) => ({
          portfolios: s.portfolios.map((p) => {
            if (p.id !== portfolioId) return p;
            return {
              ...p,
              updatedAt: nowIso(),
              positions: p.positions.map((pos) =>
                pos.id === positionId
                  ? { ...pos, manualCurrentPrice: price && price > 0 ? price : undefined }
                  : pos
              ),
            };
          }),
        }));
        get().captureSnapshots();
      },

      mergeQuotes: (quotes) => {
        set((s) => ({ prices: { ...s.prices, ...quotes } }));
      },

      refreshPrices: async (ids) => {
        const { portfolios } = get();
        const scope = portfolios.filter(
          (p) => !p.archived && (!ids || ids.includes(p.id))
        );
        const tickers = Array.from(
          new Set(scope.flatMap((p) => p.positions.map((pos) => pos.ticker.toUpperCase())).filter(Boolean))
        );
        if (tickers.length === 0) {
          set({ lastRefresh: nowIso(), refreshError: undefined });
          return { updated: 0, errors: [] };
        }
        set({ refreshing: true, refreshError: undefined });
        try {
          const { quotes, errors } = await fetchQuotes(tickers);
          get().mergeQuotes(quotes);
          get().captureSnapshots();
          const updated = Object.keys(quotes).length;
          set({
            refreshing: false,
            lastRefresh: nowIso(),
            refreshError: updated === 0 && errors.length ? errors[0] : undefined,
          });
          return { updated, errors };
        } catch (e) {
          const msg = (e as Error).message;
          set({ refreshing: false, refreshError: msg });
          return { updated: 0, errors: [msg] };
        }
      },

      captureSnapshots: () => {
        const { portfolios, prices, snapshots } = get();
        const today = todayStr();
        const next: Record<string, SnapshotPoint[]> = {};
        for (const p of portfolios) {
          const m = portfolioMetrics(p, prices);
          const point: SnapshotPoint = {
            date: today,
            value: round2(m.value),
            invested: round2(m.invested),
            returnPct: round2(m.returnPct),
          };
          const prev = snapshots[p.id] ?? [];
          const arr = prev.filter((s) => s.date !== today);
          arr.push(point);
          arr.sort((a, b) => a.date.localeCompare(b.date));
          next[p.id] = arr;
        }
        set({ snapshots: next });
      },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      exportData: () => {
        const { portfolios, prices, snapshots, settings } = get();
        return JSON.stringify(
          { app: 'ai-stock-lab', version: 1, exportedAt: nowIso(), portfolios, prices, snapshots, settings },
          null,
          2
        );
      },

      importData: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (!data || !Array.isArray(data.portfolios)) {
            return { ok: false, error: 'No "portfolios" array found in the file.' };
          }
          set({
            portfolios: data.portfolios,
            prices: data.prices && typeof data.prices === 'object' ? data.prices : {},
            snapshots: data.snapshots && typeof data.snapshots === 'object' ? data.snapshots : {},
            settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) },
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },

      clearAll: () =>
        set({ portfolios: [], prices: {}, snapshots: {}, lastRefresh: undefined, refreshError: undefined }),

      seedSample: () => {
        const { portfolios, snapshots } = buildSampleData();
        set((s) => ({
          portfolios: [...portfolios, ...s.portfolios],
          snapshots: { ...s.snapshots, ...snapshots },
        }));
      },
    }),
    {
      name: 'ai-stock-lab',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        portfolios: s.portfolios,
        prices: s.prices,
        snapshots: s.snapshots,
        settings: s.settings,
        lastRefresh: s.lastRefresh,
      }),
    }
  )
);

// ============================================================
// Sample data (offline-friendly: uses manual current prices so returns show
// immediately, plus a couple of weeks of fabricated history for the charts).
// ============================================================

function genSnapshots(invested: number, finalValue: number, days: number): SnapshotPoint[] {
  const out: SnapshotPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const t = (days - i) / days; // 0..1
    const wobble = Math.sin(t * Math.PI * 3) * (finalValue - invested) * 0.15;
    const value = round2(invested + (finalValue - invested) * t + (i === 0 ? 0 : wobble));
    const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, value, invested: round2(invested), returnPct: round2((value / invested - 1) * 100) });
  }
  return out;
}

function buildSampleData(): { portfolios: Portfolio[]; snapshots: Record<string, SnapshotPoint[]> } {
  const created = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const samples: Array<Omit<Portfolio, 'id'> & { _positions: Array<[string, string, number, number, number]> }> = [
    {
      name: 'Claude — Momentum AI',
      aiModel: 'Claude Opus 4.8',
      aiProvider: 'Anthropic',
      promptText:
        'You are a momentum-focused equity analyst. Pick 3 liquid stocks you expect to outperform over the next month and size them out of a 10,000 budget. Give entry prices and a one-line rationale each.',
      sourceLink: 'https://claude.ai/',
      baseCurrency: 'USD',
      suggestedAt: created,
      createdAt: created,
      updatedAt: created,
      positions: [],
      _positions: [
        ['NVDA', 'NVIDIA Corporation', 170, 188, 4000],
        ['MSFT', 'Microsoft Corporation', 470, 489, 3000],
        ['ASML', 'ASML Holding', 720, 705, 3000],
      ],
    },
    {
      name: 'GPT-5 — Contrarian Value',
      aiModel: 'GPT-5',
      aiProvider: 'OpenAI',
      promptText:
        'Act as a contrarian value investor. Choose 3 beaten-down large caps with catalysts in the next quarter. Allocate a 10,000 virtual budget and provide entry prices.',
      sourceLink: 'https://chatgpt.com/',
      baseCurrency: 'USD',
      suggestedAt: created,
      createdAt: created,
      updatedAt: created,
      positions: [],
      _positions: [
        ['PFE', 'Pfizer Inc.', 28, 26.5, 3500],
        ['INTC', 'Intel Corporation', 22, 24.2, 3500],
        ['KO', 'The Coca-Cola Company', 62, 63.1, 3000],
      ],
    },
    {
      name: 'Gemini — Big Tech Barbell',
      aiModel: 'Gemini 2.5 Pro',
      aiProvider: 'Google',
      promptText:
        'Build a 2-stock barbell of mega-cap tech for the next 30 days from a 10,000 budget. Give entry prices and rationale.',
      sourceLink: 'https://gemini.google.com/',
      baseCurrency: 'USD',
      suggestedAt: created,
      createdAt: created,
      updatedAt: created,
      positions: [],
      _positions: [
        ['GOOGL', 'Alphabet Inc. (Class A)', 175, 182, 5000],
        ['AMD', 'Advanced Micro Devices', 140, 132, 5000],
      ],
    },
  ];

  const portfolios: Portfolio[] = [];
  const snapshots: Record<string, SnapshotPoint[]> = {};
  for (const s of samples) {
    const id = makeId();
    const positions: Position[] = s._positions.map(([ticker, label, entry, current, amount]) => ({
      id: makeId(),
      ticker,
      label,
      entryPrice: entry,
      manualCurrentPrice: current,
      amountInvested: amount,
    }));
    const invested = positions.reduce((sum, p) => sum + p.amountInvested, 0);
    const value = positions.reduce((sum, p) => sum + p.amountInvested * (p.manualCurrentPrice! / p.entryPrice), 0);
    const { _positions, ...rest } = s;
    void _positions;
    portfolios.push({ ...rest, id, positions });
    snapshots[id] = genSnapshots(invested, value, 14);
  }
  return { portfolios, snapshots };
}
