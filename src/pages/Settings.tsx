import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { CURRENCIES } from '../data/stocks';
import { autoPricingAvailable } from '../services/prices';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const clearAll = useStore((s) => s.clearAll);
  const seedSample = useStore((s) => s.seedSample);
  const portfolios = useStore((s) => s.portfolios);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string) => {
    setStatus(text);
    window.setTimeout(() => setStatus(''), 4000);
  };

  const onExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-stock-lab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(String(reader.result));
      flash(result.ok ? 'Data imported.' : `Import failed: ${result.error}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-400">Everything is stored locally in this browser.</p>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Prices</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-indigo-500"
            checked={settings.autoPrices}
            onChange={(e) => setSettings({ autoPrices: e.target.checked })}
          />
          <span className="text-sm">
            <span className="font-medium">Enable automatic price fetching</span>
            <span className="block text-slate-400">
              Uses Yahoo Finance's free public quotes through the local dev proxy. Manual prices always work as a
              fallback.
            </span>
          </span>
        </label>
        <div className={`text-xs ${autoPricingAvailable() ? 'text-emerald-400' : 'text-amber-400'}`}>
          {autoPricingAvailable()
            ? '● Auto-pricing proxy is active (running via npm run dev).'
            : '● Auto-pricing proxy not detected — run with npm run dev, or enter prices manually.'}
        </div>

        <div>
          <label className="label">Default currency for new portfolios</label>
          <select
            className="input max-w-[160px]"
            value={settings.defaultCurrency}
            onChange={(e) => setSettings({ defaultCurrency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Backup &amp; data</h2>
        <p className="text-sm text-slate-400">
          You currently have <span className="text-slate-200 font-medium">{portfolios.length}</span> portfolio
          {portfolios.length === 1 ? '' : 's'}. Because data lives only in this browser, export a backup regularly.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={onExport}>
            ⬇ Export JSON
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            ⬆ Import JSON
          </button>
          <button className="btn-secondary" onClick={seedSample}>
            Load sample data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="hint">Importing replaces all current data with the file's contents.</p>
        {status && <div className="text-sm text-slate-300">{status}</div>}
      </section>

      <section className="card p-5 space-y-3 border-rose-900/50">
        <h2 className="font-semibold text-rose-300">Danger zone</h2>
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm('Delete ALL portfolios and data? This cannot be undone. Consider exporting first.')) {
              clearAll();
              flash('All data cleared.');
            }
          }}
        >
          Clear all data
        </button>
      </section>

      <section className="card p-5 space-y-2 text-sm text-slate-400">
        <h2 className="font-semibold text-slate-200">About</h2>
        <p>
          AI Stock Lab lets you log dated stock suggestions from different AI models and prompts as virtual
          portfolios, then watch how each performs so you can find the most reliable AI/prompt before using real
          money.
        </p>
        <p className="text-xs text-slate-500">
          Returns are computed from price ratios per position, so mixing currencies within a portfolio is fine. Prices
          via Yahoo Finance are delayed and provided without warranty. Not financial advice.
        </p>
      </section>
    </div>
  );
}
