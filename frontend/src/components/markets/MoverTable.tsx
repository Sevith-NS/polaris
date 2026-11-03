import Link from 'next/link';
import type { ReactNode } from 'react';
import { Change } from '@/components/ui/Change';
import { formatMoney } from '@/lib/format';

export type MoverItem = {
  key: string;
  symbol: string;
  href: string;
  name?: string;
  price: number | null;
  currency: string;
  change: number | null;
  /** Short labels after the symbol, such as F&O. */
  tags?: string[];
  /** Value for the optional extra column. */
  extra?: ReactNode;
};

/**
 * One row pattern for every list of moving stocks in Markets (the same
 * columns as Home's Top movers). The symbol cell is the link, so keyboard
 * and screen reader users get one stop per row.
 */
export function MoverTable({ items, caption, extraLabel }: { items: MoverItem[]; caption: string; extraLabel?: string }) {
  return (
    <table className="w-full text-table">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-white/10 text-left text-caption text-fg-3">
          <th scope="col" className="py-2 font-normal">Symbol</th>
          {extraLabel && <th scope="col" className="py-2 pl-3 text-right font-normal">{extraLabel}</th>}
          <th scope="col" className="py-2 pl-3 text-right font-normal">Last</th>
          <th scope="col" className="py-2 pl-3 text-right font-normal">Today</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.key} className="border-b border-white/[0.07] last:border-0">
            <th scope="row" className="w-full max-w-0 py-1 pr-2 text-left font-normal">
              <Link href={r.href} className="flex min-h-11 flex-col justify-center hover:underline">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="ticker truncate">{r.symbol}</span>
                  {r.tags?.map((t) => (
                    <span key={t} className="shrink-0 rounded border border-white/15 px-1 text-caption text-fg-3">{t}</span>
                  ))}
                </span>
                {r.name && <span className="truncate text-caption text-fg-3">{r.name}</span>}
              </Link>
            </th>
            {extraLabel && <td className="whitespace-nowrap py-1 pl-3 text-right tabular text-fg-2">{r.extra}</td>}
            <td className="whitespace-nowrap py-1 pl-3 text-right tabular">{formatMoney(r.price, r.currency)}</td>
            <td className="whitespace-nowrap py-1 pl-3 text-right"><Change pct={r.change} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
