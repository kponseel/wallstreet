import { formatPct, returnColor } from '../lib/format';

interface Props {
  value: number;
  showArrow?: boolean;
  className?: string;
}

export default function ReturnText({ value, showArrow, className = '' }: Props) {
  const arrow = value > 0.0001 ? '▲' : value < -0.0001 ? '▼' : '·';
  return (
    <span className={`font-mono ${returnColor(value)} ${className}`}>
      {showArrow && <span className="text-[0.7em] mr-0.5 align-middle">{arrow}</span>}
      {formatPct(value)}
    </span>
  );
}
