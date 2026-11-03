import Link from 'next/link';
import { Change } from '@/components/ui/Change';
import { formatMoney } from '@/lib/format';
import type { DiscoverCard } from '../../types/discover';
import Sparkline from './Sparkline';
import { TAG_LABELS } from './tagStyles';

/**
 * One horizon-tagged idea card. Purely descriptive: each tag carries the
 * numbers that set it, and the card opens the symbol page for the full read.
 */
export default function IdeaCard({ card }: { card: DiscoverCard }) {
  return (
    <Link href={`/s/${encodeURIComponent(card.symbol)}`}
          className="glass flex h-full flex-col gap-3 rounded-2xl p-4 hover:ring-1 hover:ring-white/25">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="ticker truncate">{card.symbol}</p>
          <p className="truncate text-caption text-fg-3">{card.name}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-body-sm tabular">{formatMoney(card.price, card.currency)}</span>
          <Change pct={card.change_1d_pct} className="text-table" />
        </div>
      </div>
      <Sparkline data={card.spark} />
      <ul className="flex flex-col gap-2">
        {card.tags.map((tag) => (
          <li key={tag.id} className="flex flex-col items-start gap-1">
            <span className="rounded border border-white/15 px-1.5 text-caption text-fg">{TAG_LABELS[tag.id]}</span>
            <span className="text-caption text-fg-3">{tag.reason}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
