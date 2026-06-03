import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { portfolioMetrics, currentPriceFor } from '../lib/calc';
import type { Position } from '../types';
import {
  formatMoney,
  formatNumber,
  formatDate,
  formatDateTime,
  daysBetween,
  returnColor,
} from '../lib/format';
import ReturnText from '../components/ReturnText';
import LineChart from '../components/LineChart';
import { autoPricingAvailable } from '../services/prices';

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost text-xs px-2 py-1"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function PriceCell({ portfolioId, pos }: { portfolioId: string; pos: Position }) {
  const prices = useStore((s) => s.prices);
  const setManualPrice = useStore((s) => s.setManualPrice);
  const live = prices[pos.ticker.toUpperCase()];
  const resolved = currentPriceFor(pos, prices);
  const isManual = typeof pos.manualCurrentPrice === 'number' && pos.manualCurrentPrice > 0;
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (resolved != null ? String(resolved) : '');

  const commit = () => {
    if (draft == null) return;
    const n = parseFloat(draft);
    setManualPrice(portfolioId, pos.id, isNaN(n) ? undefined : n);
    setDraft(null);
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <input
        className="input py-1 w-24 text-right font-mono text-sm"
        inputMode="decimal"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="—"
      />
      {isManual ? (
        <button
          type="button"
          className="text-[10px] text-amber-400 hover:underline"
          onClick={() => setManualPrice(portfolioId, pos.id, undefined)}
          title="Clear manual override, use live price"
        >
          manual ✕
        </button>
      ) : live ? (
        <span className="text-[10px] text-slate-500" title={`as of ${formatDateTime(live.asOf)}`}>
          live
        </span>
      ) : (
        <span className="text-[10px] text-slate-600">no price</span>
      )}
    </div>
  );
}

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const portfolio = useStore((s) => s.portfolios.find((p) => p.id === id));
  const prices = useStore((s) => s.prices);
  const snapshots = useStore((s) => (id ? s.snapshots[id] : undefined));
  const refreshing = useStore((s) => s.refreshing);
  const refreshPrices = useStore((s) => s.refreshPrices);
  const setArchived = useStore((s) => s.setArchived);
  const deletePortfolio = useStore((s) => s.deletePortfolio);
  const [msg, setMsg] = useState('');

  const m = useMemo(() => (portfolio ? portfolioMetrics(portfolio, prices) : null), [portfolio, prices]);

  if (!portfolio || !m) {
    return (
      <div className="card p-8 text-center space-y-4">
        <p className="text-slate-400">This portfolio doesn't exist (or was deleted).</p>
        <Link to="/" className="btn-secondary">
          Back to leaderboard
        </Link>
      </div>
    );
  }

  const p = portfolio;
  const onRefresh = async () => {
    const { updated, errors } = await refreshPrices([p.id]);
    setMsg(updated > 0 ? `Updated ${updated} ${updated === 1 ? 'price' : 'prices'}.` : errors[0] ? `No update: ${errors[0]}` : 'No update.');
    window.setTimeout(() => setMsg(''), 5000);
  };
  const onDelete = () => {
    if (window.confirm('Delete this portfolio? This cannot be undone.')) {
      deletePortfolio(p.id);
      navigate('/');
    }
  };

  const sorted = [...m.positions].sort((a, b) => b.invested - a.invested);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-400 hover:text-white">
          ← Leaderboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="badge-accent">{p.aiModel}</span>
            {p.aiProvider && <span className="badge-neutral">{p.aiProvider}</span>}
            <span className="badge-neutral">{p.baseCurrency}</span>
            {p.archived && <span className="badge-neutral text-amber-400">archived</span>}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Suggested {formatDate(p.suggestedAt)} · {daysBetween(p.suggestedAt)} days ago
          </div>
        </div>
        <div className="text-right">
          <ReturnText value={m.returnPct} showArrow className="text-3xl font-bold" />
          <div className="text-sm text-slate-300 mt-1">{formatMoney(m.value, p.baseCurrency)}</div>
          <div className="text-xs text-slate-500">invested {formatMoney(m.invested, p.baseCurrency)}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : '⟳ Refresh prices'}
        </button>
        <Link to={`/p/${p.id}/edit`} className="btn-secondary">
          Edit
        </Link>
        <button className="btn-secondary" onClick={() => setArchived(p.id, !p.archived)}>
          {p.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button className="btn-danger" onClick={onDelete}>
          Delete
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
      {!autoPricingAvailable() && (
        <p className="hint">Auto-pricing needs the local dev server. You can type each current price in the table below.</p>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-400">P&amp;L</div>
          <div className={`text-xl font-bold font-mono ${returnColor(m.pnl)}`}>
            {m.pnl >= 0 ? '+' : ''}
            {formatMoney(m.pnl, p.baseCurrency)}
          </div>
        </div>
        <div className="card p-4 min-w-0">
          <div className="text-xs text-slate-400">Best position</div>
          {m.best ? (
            <div className="truncate">
              <span className="font-semibold">{m.best.position.ticker}</span>{' '}
              <ReturnText value={m.best.returnPct} className="text-sm" />
            </div>
          ) : (
            <div className="text-slate-500">—</div>
          )}
        </div>
        <div className="card p-4 min-w-0">
          <div className="text-xs text-slate-400">Worst position</div>
          {m.worst ? (
            <div className="truncate">
              <span className="font-semibold">{m.worst.position.ticker}</span>{' '}
              <ReturnText value={m.worst.returnPct} className="text-sm" />
            </div>
          ) : (
            <div className="text-slate-500">—</div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="card p-4">
        <div className="text-sm font-semibold mb-2">Value over time</div>
        <LineChart data={snapshots ?? []} />
      </div>

      {/* Positions table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Position</th>
                <th className="px-4 py-3 font-medium text-right">Entry</th>
                <th className="px-4 py-3 font-medium text-right">Current</th>
                <th className="px-4 py-3 font-medium text-right">Value</th>
                <th className="px-4 py-3 font-medium text-right">Return</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((pm) => (
                <tr key={pm.position.id} className="border-b border-slate-800/60 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{pm.position.ticker}</div>
                    {pm.position.label && <div className="text-xs text-slate-500 truncate max-w-[180px]">{pm.position.label}</div>}
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      {formatNumber(pm.shares, 4)} sh · {(pm.weight * 100).toFixed(0)}%
                    </div>
                    {pm.position.rationale && (
                      <div className="text-xs text-slate-400 mt-1 max-w-[220px]">{pm.position.rationale}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumber(pm.entryPrice, 2)}</td>
                  <td className="px-4 py-3 text-right">
                    <PriceCell portfolioId={p.id} pos={pm.position} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono">{formatMoney(pm.value, p.baseCurrency)}</div>
                    <div className={`text-xs font-mono ${returnColor(pm.pnl)}`}>
                      {pm.pnl >= 0 ? '+' : ''}
                      {formatNumber(pm.pnl, 2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReturnText value={pm.returnPct} showArrow />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prompt / answer / link / notes */}
      {(p.promptText || p.answerText || p.sourceLink || p.notes) && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold">Prompt &amp; answer</h2>

          {p.sourceLink && (
            <div className="text-sm">
              <span className="text-slate-400">Source: </span>
              <a href={p.sourceLink} target="_blank" rel="noreferrer" className="text-indigo-300 hover:underline break-all">
                {p.sourceLink}
              </a>
            </div>
          )}

          {p.promptText && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Prompt</span>
                <CopyButton text={p.promptText} />
              </div>
              <pre className="whitespace-pre-wrap break-words text-sm bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-slate-200">
                {p.promptText}
              </pre>
            </div>
          )}

          {p.answerText && (
            <details>
              <summary className="text-sm text-slate-400 cursor-pointer">AI answer</summary>
              <pre className="whitespace-pre-wrap break-words text-sm bg-slate-950 border border-slate-800 rounded-lg p-3 mt-2 text-slate-200">
                {p.answerText}
              </pre>
            </details>
          )}

          {p.notes && (
            <div className="text-sm">
              <span className="text-slate-400">Notes: </span>
              <span className="text-slate-200">{p.notes}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-slate-600">Logged {formatDateTime(p.createdAt)}</div>
    </div>
  );
}
