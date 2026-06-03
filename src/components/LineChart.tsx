import type { SnapshotPoint } from '../types';
import { formatDate } from '../lib/format';

interface Props {
  data: SnapshotPoint[];
  height?: number;
}

export default function LineChart({ data, height = 220 }: Props) {
  if (!data || data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-center text-sm text-slate-500 px-4">
        Not enough history yet — refresh prices over a few days and the value curve builds up here.
      </div>
    );
  }

  const width = 760;
  const padX = 10;
  const padTop = 14;
  const padBottom = 24;
  const innerH = height - padTop - padBottom;

  const invested = data[data.length - 1].invested;
  const values = data.map((d) => d.value);
  const min = Math.min(...values, invested);
  const max = Math.max(...values, invested);
  const range = max - min || 1;

  const x = (i: number) => padX + (i / (data.length - 1)) * (width - padX * 2);
  const y = (v: number) => padTop + innerH - ((v - min) / range) * innerH;

  const linePts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const areaPts = `${x(0).toFixed(1)},${y(min).toFixed(1)} ${linePts} ${x(data.length - 1).toFixed(1)},${y(min).toFixed(1)}`;
  const up = values[values.length - 1] >= invested;
  const stroke = up ? '#34d399' : '#fb7185';
  const investedY = y(invested);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 'auto' }} role="img" aria-label="Portfolio value over time">
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points={areaPts} fill="url(#lc-grad)" />

      {/* invested baseline */}
      <line x1={padX} y1={investedY} x2={width - padX} y2={investedY} stroke="#475569" strokeDasharray="4 4" strokeWidth={1} />
      <text x={width - padX} y={investedY - 4} fontSize="10" fill="#64748b" textAnchor="end">
        invested
      </text>

      <polyline points={linePts} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      <text x={padX} y={height - 7} fontSize="11" fill="#64748b">
        {formatDate(data[0].date)}
      </text>
      <text x={width - padX} y={height - 7} fontSize="11" fill="#64748b" textAnchor="end">
        {formatDate(data[data.length - 1].date)}
      </text>
    </svg>
  );
}
