import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { leaderboard } from '../lib/calc';
import { formatMoney, timeAgo, daysBetween } from '../lib/format';
import ReturnText from '../components/ReturnText';
import Sparkline from '../components/Sparkline';
import { autoPricingAvailable } from '../services/prices';

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

export default function Dashboard() {
  const portfolios = useStore((s) => s.portfolios);
  const prices = useStore((s) => s.prices);
  const snapshots = useStore((s) => s.snapshots);
  const refreshing = useStore((s) => s.refreshing);
  const lastRefresh = useStore((s) => s.lastRefresh);
  const refreshPrices = useStore((s) => s.refreshPrices);
  const seedSample = useStore((s) => s.seedSample);
  const [msg, setMsg] = useState('');

  const active = useMemo(() => portfolios.filter((p) => !p.archived), [portfolios]);
  const archived = useMemo(() => portfolios.filter((p) => p.archived), [portfolios]);
  const rows = useMemo(() => leaderboard(active, prices), [active, prices]);

  const avgReturn = rows.length ? rows.reduce((s, r) => s + r.metrics.returnPct, 0) / rows.length : 0;

  const onRefresh = async () => {
    const { updated, errors } = await refreshPrices();
    if (updated === 0 && errors.length) {
      setMsg(
        autoPricingAvailable()
          ? `Couldn't fetch prices (${errors[0]}). Enter them manually on each position.`
          : 'Auto-pricing needs the local dev server (npm run dev). Otherwise enter prices manually.'
      );
    } else {
      setMsg(`Updated ${updated} ${updated === 1 ? 'price' : 'prices'}.`);
    }
    window.setTimeout(() => setMsg(''), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-slate-400">Which AI model + prompt is winning over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : '⟳ Refresh prices'}
          </button>
          <Link to="/new" className="btn-primary">
            ＋ New portfolio
          </Link>
        </div>
      </div>

      {(msg || lastRefresh) && (
        <div className="text-xs text-slate-500">
          {msg && <span className="text-slate-300">{msg} </span>}
          {lastRefresh && <span>Prices updated {timeAgo(lastRefresh)}.</span>}
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4">
            <div className="text-xs text-slate-400">Portfolios</div>
            <div className="text-2xl font-bold">{rows.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-slate-400">Average return</div>
            <div className="text-2xl font-bold">
              <ReturnText value={avgReturn} />
            </div>
          </div>
          <div className="card p-4 min-w-0">
            <div className="text-xs text-slate-400">Leading</div>
            <div className="text-sm font-semibold truncate" title={rows[0].portfolio.name}>
              {rows[0].portfolio.aiModel}
            </div>
            <ReturnText value={rows[0].metrics.returnPct} className="text-sm" />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card p-10 text-center space-y-4">
          <div className="text-4xl">🧪</div>
          <div>
            <h2 className="text-lg font-semibold">No portfolios yet</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
              Ask an AI for stock picks, then log them here with the model, prompt and entry prices. Track which
              AI/prompt actually performs before risking real money.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link to="/new" className="btn-primary">
              ＋ Add your first portfolio
            </Link>
            <button className="btn-secondary" onClick={seedSample}>
              Load sample data
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ portfolio: p, metrics: m, rank }) => {
            const spark = (snapshots[p.id] ?? []).map((s) => s.value);
            return (
              <Link key={p.id} to={`/p/${p.id}`} className="card-hover p-4 flex items-center gap-3 sm:gap-4">
                <div className="w-8 shrink-0 text-center text-lg font-semibold text-slate-400">{medal(rank)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1">
                    <span className="badge-accent">{p.aiModel}</span>
                    <span>{m.totalCount} pos</span>
                    <span>· {daysBetween(p.suggestedAt)}d</span>
                    {!m.fullyPriced && (
                      <span className="text-amber-400">· {m.pricedCount}/{m.totalCount} priced</span>
                    )}
                  </div>
                </div>
                <Sparkline data={spark} className="hidden sm:block shrink-0" />
                <div className="text-right shrink-0">
                  <ReturnText value={m.returnPct} showArrow className="text-lg font-semibold" />
                  <div className="text-xs text-slate-400">{formatMoney(m.value, p.baseCurrency)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm text-slate-400">Archived ({archived.length})</summary>
          <div className="mt-3 space-y-2">
            {archived.map((p) => (
              <Link key={p.id} to={`/p/${p.id}`} className="flex items-center justify-between text-sm py-1 hover:text-white">
                <span className="truncate">{p.name}</span>
                <span className="text-slate-500">{p.aiModel}</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
