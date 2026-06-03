import { useState } from 'react';
import type { PositionInput } from '../types';
import { TickerInput, StockDatalist } from './TickerInput';
import { findStock } from '../data/stocks';
import { fetchQuote, autoPricingAvailable } from '../services/prices';
import { formatNumber } from '../lib/format';

interface DraftRow {
  id: string;
  ticker: string;
  label?: string;
  entryPrice: string;
  amountInvested: string;
  rationale: string;
}

let counter = 0;
const rid = () => `row-${counter++}-${Math.random().toString(36).slice(2, 7)}`;
const emptyRow = (): DraftRow => ({ id: rid(), ticker: '', entryPrice: '', amountInvested: '', rationale: '' });

function toDraft(positions?: PositionInput[]): DraftRow[] {
  if (!positions || positions.length === 0) return [emptyRow(), emptyRow()];
  return positions.map((p) => ({
    id: rid(),
    ticker: p.ticker,
    label: p.label,
    entryPrice: p.entryPrice ? String(p.entryPrice) : '',
    amountInvested: p.amountInvested ? String(p.amountInvested) : '',
    rationale: p.rationale ?? '',
  }));
}

function parseRows(rows: DraftRow[]): PositionInput[] {
  return rows
    .filter((r) => r.ticker.trim() || r.entryPrice || r.amountInvested)
    .map((r) => ({
      ticker: r.ticker.trim().toUpperCase(),
      label: r.label || findStock(r.ticker)?.name,
      entryPrice: parseFloat(r.entryPrice) || 0,
      amountInvested: parseFloat(r.amountInvested) || 0,
      rationale: r.rationale.trim() || undefined,
    }));
}

interface Props {
  initial?: PositionInput[];
  onChange: (positions: PositionInput[]) => void;
}

export default function PositionsEditor({ initial, onChange }: Props) {
  const [rows, setRows] = useState<DraftRow[]>(() => toDraft(initial));
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const commit = (next: DraftRow[]) => {
    setRows(next);
    onChange(parseRows(next));
  };
  const setRow = (id: string, patch: Partial<DraftRow>) => commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => commit([...rows, emptyRow()]);
  const removeRow = (id: string) => commit(rows.length > 1 ? rows.filter((r) => r.id !== id) : rows);

  const totalInvested = rows.reduce((s, r) => s + (parseFloat(r.amountInvested) || 0), 0);

  const autofill = async (row: DraftRow) => {
    if (!row.ticker.trim()) return;
    setLoadingId(row.id);
    try {
      const q = await fetchQuote(row.ticker);
      setRow(row.id, { entryPrice: String(q.price), label: row.label || findStock(row.ticker)?.name });
    } catch {
      // Network/CORS/unknown symbol — leave it for manual entry.
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <StockDatalist />
      {rows.map((row) => {
        const amount = parseFloat(row.amountInvested) || 0;
        const entry = parseFloat(row.entryPrice) || 0;
        const shares = entry > 0 ? amount / entry : 0;
        const weight = totalInvested > 0 ? (amount / totalInvested) * 100 : 0;
        const stock = findStock(row.ticker);
        return (
          <div key={row.id} className="card p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-12 sm:col-span-4">
                <label className="hint">Ticker</label>
                <TickerInput value={row.ticker} onChange={(v) => setRow(row.id, { ticker: v, label: findStock(v)?.name })} />
                {stock && <div className="hint truncate">{stock.name} · {stock.market}</div>}
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="hint">Entry price</label>
                <div className="flex gap-1">
                  <input
                    className="input"
                    inputMode="decimal"
                    value={row.entryPrice}
                    onChange={(e) => setRow(row.id, { entryPrice: e.target.value })}
                    placeholder="0.00"
                  />
                  {autoPricingAvailable() && (
                    <button
                      type="button"
                      className="btn-secondary px-2"
                      title="Fill with latest price"
                      onClick={() => autofill(row)}
                      disabled={loadingId === row.id || !row.ticker.trim()}
                    >
                      {loadingId === row.id ? '…' : '⟳'}
                    </button>
                  )}
                </div>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className="hint">Amount</label>
                <input
                  className="input"
                  inputMode="decimal"
                  value={row.amountInvested}
                  onChange={(e) => setRow(row.id, { amountInvested: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="col-span-12 sm:col-span-2 flex sm:flex-col sm:items-end justify-between pt-1">
                <div className="text-xs text-slate-400 sm:text-right leading-tight font-mono">
                  <div>{shares > 0 ? `${formatNumber(shares, 4)} sh` : '—'}</div>
                  {weight > 0 && <div className="text-slate-500">{weight.toFixed(0)}%</div>}
                </div>
                <button
                  type="button"
                  className="text-slate-500 hover:text-rose-400 text-sm px-1"
                  onClick={() => removeRow(row.id)}
                  title="Remove position"
                >
                  ✕
                </button>
              </div>
            </div>

            <input
              className="input text-sm"
              value={row.rationale}
              onChange={(e) => setRow(row.id, { rationale: e.target.value })}
              placeholder="Rationale (optional)"
            />
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <button type="button" className="btn-ghost" onClick={addRow}>
          ＋ Add position
        </button>
        <div className="text-sm text-slate-400">
          Total invested: <span className="font-mono text-slate-200">{formatNumber(totalInvested, 2)}</span>
        </div>
      </div>
    </div>
  );
}
