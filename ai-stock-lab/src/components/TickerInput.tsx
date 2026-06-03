import { STOCKS } from '../data/stocks';

/** Render once per form; shared by all TickerInput instances. */
export function StockDatalist() {
  return (
    <datalist id="stocks-datalist">
      {STOCKS.map((s) => (
        <option key={s.ticker} value={s.ticker}>
          {s.name}
        </option>
      ))}
    </datalist>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TickerInput({ value, onChange, placeholder = 'AAPL', className = 'input' }: Props) {
  return (
    <input
      className={className}
      list="stocks-datalist"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck={false}
    />
  );
}
