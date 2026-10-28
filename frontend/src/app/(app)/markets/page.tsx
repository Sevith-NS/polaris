'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { Panel } from '@/components/PageHeader';
import FreshnessNote from '@/components/discover/FreshnessNote';
import UniversePicker from '@/components/discover/UniversePicker';
import { BreadthBar } from '@/components/home/MarketBreadth';
import { MoverTable, type MoverItem } from '@/components/markets/MoverTable';
import { useUniverse, useUniverses } from '@/components/markets/universe';
import { Button } from '@/components/ui/Button';
import { Change } from '@/components/ui/Change';
import { ArrowRight } from '@/components/ui/icons';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { direction, formatMoney } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { DiscoverCard, DiscoverResponse } from '@/types/discover';

const MOVERS = 5;

/** Tile fill grows with the size of the move. The sign and arrow say the direction too. */
function tileTone(change: number | null) {
  const dir = direction(change);
  if (change === null || dir === 'flat') return 'bg-white/[0.04]';
  const size = Math.abs(change);
  if (dir === 'up') return size >= 5 ? 'bg-up/25' : size >= 2 ? 'bg-up/15' : 'bg-up/10';
  return size >= 5 ? 'bg-down/25' : size >= 2 ? 'bg-down/15' : 'bg-down/10';
}

const toItem = (c: DiscoverCard): MoverItem => ({
  key: c.symbol, symbol: c.symbol, href: `/s/${encodeURIComponent(c.symbol)}`,
  name: c.name, price: c.price, currency: c.currency, change: c.change_1d_pct,
});

function Loading() {
  return (
    <div role="status" aria-label="Loading this market" className="flex flex-col gap-5">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {Array.from({ length: 16 }, (_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    </div>
  );
}

function Overview() {
  const [universe, setUniverse] = useUniverse();
  const { data, error, loading, reload } = useApi<DiscoverResponse>(
    `/api/discover?universe=${encodeURIComponent(universe)}&all=1`,
  );
  const universes = useUniverses(data?.universes);

  const cards = useMemo(() => data?.cards ?? [], [data]);
  const day = useMemo(() => {
    const priced = cards.filter((c) => c.change_1d_pct !== null);
    const byMove = [...priced].sort((a, b) => (b.change_1d_pct as number) - (a.change_1d_pct as number));
    const up = byMove.filter((c) => direction(c.change_1d_pct) === 'up');
    const down = byMove.filter((c) => direction(c.change_1d_pct) === 'down');
    return {
      up: up.length, down: down.length, flat: priced.length - up.length - down.length,
      tiles: [...byMove, ...cards.filter((c) => c.change_1d_pct === null)],
      // Only names that moved that way, as on Home. On a red day the top of the list can still be down.
      gainers: up.slice(0, MOVERS), losers: down.reverse().slice(0, MOVERS),
      tagged: cards.filter((c) => c.tags.length > 0).length,
    };
  }, [cards]);
  const label = data?.universe_label ?? 'this market';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UniversePicker universes={universes} value={universe} onChange={setUniverse} />
        <FreshnessNote asOf={data?.as_of} freshness={data} />
      </div>
      {universe === 'bonds' && (
        <p className="text-body-sm text-fg-2">Bond prices have no free live feed, so bond ETFs from the US and India stand in.</p>
      )}

      {loading && !data ? <Loading />
        : error && !data ? <ErrorState error={error} title="Couldn't load this market" onRetry={reload} />
        : !cards.length ? (
          <EmptyState title="No prices right now" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>
            The price feed returned nothing for {label}. It usually recovers within half an hour.
          </EmptyState>
        ) : (
          <>
            <section aria-labelledby="day-h" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
              <div className="flex flex-col gap-1">
                <h2 id="day-h" className="text-body-sm text-fg-2">Today in {label}</h2>
                <p className="text-figure tabular">
                  {day.up} <span className="text-h4 text-fg-2">of {day.up + day.down + day.flat} are up</span>
                </p>
              </div>
              <BreadthBar b={{
                universe: label, advancing: day.up, declining: day.down, unchanged: day.flat,
                priced: cards.length, scanned: data?.scanned ?? cards.length,
                coverage_pct: Math.round((cards.length / (data?.scanned || cards.length)) * 100),
                partial: cards.length < (data?.scanned ?? 0),
              }} />
            </section>

            <Panel level={2} id="moves-h" title="Today's moves" aside={`${cards.length} names, biggest gain first`}>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {day.tiles.map((c) => (
                  <li key={c.symbol}>
                    <Link href={`/s/${encodeURIComponent(c.symbol)}`}
                          className={clsx('flex min-h-16 flex-col justify-between gap-1 rounded-lg p-2.5 hover:ring-1 hover:ring-white/30',
                            tileTone(c.change_1d_pct))}>
                      <span className="ticker truncate text-body-sm">{c.symbol}</span>
                      <span className="flex flex-col">
                        <span className="truncate text-caption text-fg-2 tabular">{formatMoney(c.price, c.currency)}</span>
                        <Change pct={c.change_1d_pct} className="text-table" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Panel level={2} id="gains-h" title="Biggest gains">
                {day.gainers.length ? <MoverTable items={day.gainers.map(toItem)} caption={`Biggest gains in ${label} today`} />
                  : <p className="text-body-sm text-fg-2">Nothing in {label} is up today.</p>}
              </Panel>
              <Panel level={2} id="falls-h" title="Biggest falls">
                {day.losers.length ? <MoverTable items={day.losers.map(toItem)} caption={`Biggest falls in ${label} today`} />
                  : <p className="text-body-sm text-fg-2">Nothing in {label} is down today.</p>}
              </Panel>
            </div>

            <Link href={`/markets/ideas?u=${encodeURIComponent(universe)}`}
                  className="glass group flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 md:p-6">
              <span className="flex flex-col gap-1">
                <span className="text-h4">Setups in {label}</span>
                <span className="text-body-sm text-fg-2">
                  {day.tagged
                    ? `${day.tagged} names carry a setup tag, with the numbers that set it.`
                    : 'Nothing is tagged right now. Tags update as prices refresh, about every 30 minutes.'}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-body-sm text-fg">
                Open Ideas
                <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-fast motion-safe:group-hover:translate-x-0.5" />
              </span>
            </Link>
          </>
        )}
    </div>
  );
}

export default function MarketsOverview() {
  return <Suspense fallback={<Loading />}><Overview /></Suspense>;
}
