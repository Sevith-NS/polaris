import Link from 'next/link';
import clsx from 'clsx';
import { formatMoney, formatNumber } from '@/lib/format';
import type { LevelRow } from '../../types/discover';
import Sparkline from './Sparkline';

/**
 * One name sitting at a respected level. The distance to the level is the
 * reason the card exists, so it is the largest number. The side is written
 * out as a word as well as tinted, so colour is never the only signal.
 */

const SIDE = {
  resistance: { chip: 'border-down/30 bg-down/10 text-down', label: 'Resistance' },
  support: { chip: 'border-up/30 bg-up/10 text-up', label: 'Support' },
} as const;

const chip = 'rounded border border-white/15 px-1.5 text-caption text-fg-2';

export default function LevelCard({ row }: { row: LevelRow }) {
  const side = SIDE[row.side];
  // Positive distance means the level is above the price.
  const where = row.distance_pct >= 0 ? 'above' : 'below';

  return (
    <Link href={`/s/${encodeURIComponent(row.symbol)}`}
          className="glass flex h-full flex-col gap-3 rounded-2xl p-4 hover:ring-1 hover:ring-white/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ticker truncate">{row.symbol}</p>
          <p className="truncate text-caption text-fg-3">{row.name}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-body-sm tabular">{formatMoney(row.price, row.currency)}</span>
          <span className="text-caption text-fg-3">Price</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-h3 font-medium tabular">{formatNumber(Math.abs(row.distance_pct), 1)}%</p>
          <p className="text-caption text-fg-2">
            {side.label} {where} the price, at <span className="tabular text-fg">{formatMoney(row.level, row.currency)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-body-sm tabular">{formatNumber(row.distance_sigmas, 1)}σ</span>
          <span className="text-caption text-fg-3">daily moves away</span>
        </div>
      </div>

      <Sparkline data={row.spark} />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={clsx('rounded border px-1.5 text-caption', side.chip)}>{side.label}</span>
        <span className={chip}>{row.timeframe === 'daily' ? 'Daily' : 'Weekly'}</span>
        <span className={clsx(chip, 'tabular')}>{row.touches} touches</span>
        {row.confluence && <span className={chip}>Daily and weekly</span>}
        {row.flipped && <span className={chip}>Was support and resistance</span>}
      </div>

      <p className="text-caption text-fg-3">{row.reason}</p>

      <div className="mt-auto flex items-center gap-2 border-t border-white/10 pt-2">
        <span className="text-caption text-fg-3">Level quality</span>
        {/* The bar repeats the number beside it; it is never the only read. */}
        <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <span className="block h-full bg-fg-2/70" style={{ width: `${Math.max(0, Math.min(100, row.score))}%` }} />
        </span>
        <span className="text-caption tabular text-fg-2">{formatNumber(row.score, 0)}</span>
      </div>
    </Link>
  );
}
