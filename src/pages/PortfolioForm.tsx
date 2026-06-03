import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { PortfolioInput, PositionInput } from '../types';
import { AI_MODELS, CURRENCIES } from '../data/stocks';
import PositionsEditor from '../components/PositionsEditor';
import { toDateTimeLocal } from '../lib/format';

export default function PortfolioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = useStore((s) => (id ? s.portfolios.find((p) => p.id === id) : undefined));
  const defaultCurrency = useStore((s) => s.settings.defaultCurrency);
  const addPortfolio = useStore((s) => s.addPortfolio);
  const updatePortfolio = useStore((s) => s.updatePortfolio);
  const editing = Boolean(id);

  const [name, setName] = useState(existing?.name ?? '');
  const [aiModel, setAiModel] = useState(existing?.aiModel ?? '');
  const [aiProvider, setAiProvider] = useState(existing?.aiProvider ?? '');
  const [baseCurrency, setBaseCurrency] = useState(existing?.baseCurrency ?? defaultCurrency);
  const [suggestedAt, setSuggestedAt] = useState(
    toDateTimeLocal(existing?.suggestedAt ?? new Date().toISOString())
  );
  const [sourceLink, setSourceLink] = useState(existing?.sourceLink ?? '');
  const [promptText, setPromptText] = useState(existing?.promptText ?? '');
  const [answerText, setAnswerText] = useState(existing?.answerText ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [positions, setPositions] = useState<PositionInput[]>(existing?.positions ?? []);
  const [error, setError] = useState('');

  if (editing && !existing) {
    return (
      <div className="card p-8 text-center space-y-4">
        <p className="text-slate-400">Portfolio not found.</p>
        <Link to="/" className="btn-secondary">
          Back to leaderboard
        </Link>
      </div>
    );
  }

  const validPositions = positions.filter((p) => p.ticker && p.entryPrice > 0 && p.amountInvested > 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the portfolio a name.');
    if (!aiModel.trim()) return setError('Which AI model produced this? (e.g. GPT-5)');
    if (validPositions.length === 0) {
      return setError('Add at least one position with a ticker, entry price and amount.');
    }
    const input: PortfolioInput = {
      name,
      aiModel,
      aiProvider,
      baseCurrency,
      suggestedAt: suggestedAt ? new Date(suggestedAt).toISOString() : new Date().toISOString(),
      sourceLink,
      promptText,
      answerText,
      notes,
      positions: validPositions,
    };
    if (editing && id) {
      updatePortfolio(id, input);
      navigate(`/p/${id}`);
    } else {
      const created = addPortfolio(input);
      navigate(`/p/${created.id}`);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <datalist id="ai-models">
        {AI_MODELS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{editing ? 'Edit portfolio' : 'New portfolio'}</h1>
        <Link to={editing && id ? `/p/${id}` : '/'} className="btn-ghost">
          Cancel
        </Link>
      </div>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Source</h2>
        <div>
          <label className="label">Portfolio name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Claude — Momentum picks #1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">AI model *</label>
            <input className="input" list="ai-models" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="GPT-5, Claude Opus 4.8…" />
          </div>
          <div>
            <label className="label">Provider</label>
            <input className="input" value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} placeholder="OpenAI, Anthropic, Google…" />
          </div>
          <div>
            <label className="label">Answer date &amp; time</label>
            <input className="input" type="datetime-local" value={suggestedAt} onChange={(e) => setSuggestedAt(e.target.value)} />
          </div>
          <div>
            <label className="label">Base currency</label>
            <select className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Conversation / source link</label>
          <input className="input" type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} placeholder="https://chatgpt.com/share/… (the prompt you used)" />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Positions</h2>
          <p className="hint">Enter the tickers and amounts you'd allocate based on the AI's recommendation, with the price at suggestion time.</p>
        </div>
        <PositionsEditor initial={existing?.positions} onChange={setPositions} />
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold">Prompt &amp; answer <span className="font-normal text-slate-500 text-sm">(optional)</span></h2>
        <div>
          <label className="label">Prompt used</label>
          <textarea className="input min-h-[90px] font-mono text-sm" value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="Paste the exact prompt you gave the AI…" />
        </div>
        <div>
          <label className="label">AI answer / rationale</label>
          <textarea className="input min-h-[90px] text-sm" value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Paste the AI's full answer (optional)…" />
        </div>
        <div>
          <label className="label">Your notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want to remember about this run" />
        </div>
      </section>

      {error && <div className="text-sm text-rose-400">{error}</div>}

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary">
          {editing ? 'Save changes' : 'Create portfolio'}
        </button>
        <Link to={editing && id ? `/p/${id}` : '/'} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
