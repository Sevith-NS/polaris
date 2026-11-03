'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import FreshnessNote from '@/components/discover/FreshnessNote';
import IdeaCard from '@/components/discover/IdeaCard';
import LevelCard from '@/components/discover/LevelCard';
import UniversePicker from '@/components/discover/UniversePicker';
import { TAG_LABELS, TAG_ORDER } from '@/components/discover/tagStyles';
import { Method } from '@/components/markets/Method';
import { useUniverse, useUniverses } from '@/components/markets/universe';
import { Change } from '@/components/ui/Change';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { formatMoney, formatNumber } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type {
  DiscoverResponse, HorizonTagId, LevelSide, LevelsResponse, ScreenRunResponse, ScreensListResponse,
} from '@/types/discover';

type View = 'ideas' | 'levels' | 'screens';
const VIEWS: View[] = ['ideas', 'levels', 'screens'];
const DEFAULT_SCREEN = 'short_term_breakout';
const SIDES: { id: LevelSide | 'all'; label: string }[] = [
  { id: 'all', label: 'Both sides' },
  { id: 'resistance', label: 'At resistance' },
  { id: 'support', label: 'At support' },
];
const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function CardsLoading({ tall = false }: { tall?: boolean }) {
  return <LoadingBlock lines={tall ? 12 : 8} />;
}

const decimals = (v: number | null | undefined) => (v == null ? 0 : (String(v).split('.')[1] ?? '').length);

function Ideas({ data, tag, onTag }: { data: DiscoverResponse; tag: HorizonTagId | 'all'; onTag: (t: HorizonTagId | 'all') => void }) {
  const counts = useMemo(() => {
    const n = {} as Record<HorizonTagId, number>;
    for (const card of data.cards) for (const t of card.tags) n[t.id] = (n[t.id] ?? 0) + 1;
    return n;
  }, [data]);
  const present = TAG_ORDER.filter((id) => counts[id] > 0);
  // A tag the new universe doesn't have falls back to All.
  const active = tag !== 'all' && counts[tag] ? tag : 'all';
  const shown = active === 'all' ? data.cards : data.cards.filter((c) => c.tags.some((t) => t.id === active));

  if (!data.cards.length) {
    return (
      <EmptyState title={`No setups in ${data.universe_label} right now`}>
        Tags update as prices refresh, about every 30 minutes.
      </EmptyState>
    );
  }
  return (
    <>
      <Segmented label="Setup type" value={active} onChange={onTag}
                 options={[{ id: 'all', label: `All ${data.cards.length}` },
                   ...present.map((id) => ({ id, label: `${TAG_LABELS[id]} ${counts[id]}` }))]} />
      <p className="text-caption text-fg-3">Listed A to Z, not ranked.</p>
      <ul className={GRID}>
        {shown.map((card) => <li key={card.symbol}><IdeaCard card={card} /></li>)}
      </ul>
    </>
  );
}

function Levels({ data }: { data: LevelsResponse }) {
  if (!data.rows.length) {
    return (
      <EmptyState title={`Nothing in ${data.universe_label} is at a level right now`}>
        Every name is too far from its nearest respected level. Try another universe or both sides.
      </EmptyState>
    );
  }
  return (
    <>
      <p className="text-caption text-fg-3 tabular">
        {data.matched} at a level, {data.parsed} of {data.scanned} scanned. Best levels first.
      </p>
      <ul className={GRID}>
        {data.rows.map((row) => <li key={row.symbol}><LevelCard row={row} /></li>)}
      </ul>
    </>
  );
}

function ScreenResults({ run }: { run: ScreenRunResponse }) {
  if (!run.matched) {
    return (
      <EmptyState title={`No matches in ${run.universe_label} right now`}>
        Screens run again as prices refresh, about every 30 minutes.
      </EmptyState>
    );
  }
  // The backend rounds per column (RSI to 1 place, day counts to 0). JSON drops a trailing .0,
  // so each column shows the most places any of its values has.
  const digits = Object.fromEntries(run.columns.map((c) => [c.key, Math.max(0, ...run.matches.map((m) => decimals(m.values[c.key])))]));
  return (
    <>
      <p className="text-caption text-fg-3 tabular">
        {run.matched} of {run.scanned} match. Listed A to Z, not ranked.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-table">
          <caption className="sr-only">{`${run.screen.name} matches in ${run.universe_label}`}</caption>
          <thead>
            <tr className="border-b border-white/10 text-left text-caption text-fg-3">
              <th scope="col" className="py-2 font-normal">Symbol</th>
              <th scope="col" className="py-2 pl-4 text-right font-normal">Last</th>
              <th scope="col" className="py-2 pl-4 text-right font-normal">Today</th>
              {run.columns.map((c) => (
                <th key={c.key} scope="col" className="whitespace-nowrap py-2 pl-4 text-right font-normal">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {run.matches.map((m) => (
              <tr key={m.symbol} className="border-b border-white/[0.07] last:border-0">
                <th scope="row" className="py-1 pr-2 text-left font-normal">
                  <Link href={`/s/${encodeURIComponent(m.symbol)}`} className="flex min-h-11 flex-col justify-center hover:underline">
                    <span className="flex items-center gap-1.5">
                      <span className="ticker">{m.symbol}</span>
                      {!m.volume_confirmed && (
                        <span className="rounded border border-warn/40 px-1 text-caption text-warn">Price only</span>
                      )}
                    </span>
                    <span className="max-w-56 truncate text-caption text-fg-3">{m.name}</span>
                  </Link>
                </th>
                <td className="whitespace-nowrap py-1 pl-4 text-right tabular">{formatMoney(m.price, m.currency)}</td>
                <td className="whitespace-nowrap py-1 pl-4 text-right"><Change pct={m.change_1d_pct} /></td>
                {run.columns.map((c) => (
                  <td key={c.key} className="whitespace-nowrap py-1 pl-4 text-right tabular text-fg-2">
                    {m.values[c.key] == null ? 'Unavailable' : formatNumber(m.values[c.key], digits[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {run.matches.some((m) => !m.volume_confirmed) && (
        <p className="text-caption text-fg-3">Price only means volume data was unavailable, so only the price rules were checked.</p>
      )}
    </>
  );
}

function DiscoverContent() {
  const last = usePathname().split('/').pop() as View;
  const view: View = VIEWS.includes(last) ? last : 'ideas';
  const [universe, setUniverse] = useUniverse();
  const u = encodeURIComponent(universe);
  const [tag, setTag] = useState<HorizonTagId | 'all'>('all');
  const [side, setSide] = useState<LevelSide | 'all'>('all');
  const [screenId, setScreenId] = useState(DEFAULT_SCREEN);

  // Only the open view fetches, so changing universe never runs a scan nobody is looking at.
  const ideas = useApi<DiscoverResponse>(view === 'ideas' ? `/api/discover?universe=${u}` : null);
  const levels = useApi<LevelsResponse>(view === 'levels' ? `/api/levels?universe=${u}&side=${side}` : null);
  const screens = useApi<ScreensListResponse>(view === 'screens' ? '/api/screens' : null);
  const run = useApi<ScreenRunResponse>(
    view === 'screens' && !screens.error ? `/api/screens/run?id=${encodeURIComponent(screenId)}&universe=${u}` : null,
  );
  const universes = useUniverses(ideas.data?.universes ?? levels.data?.universes ?? screens.data?.universes);

  const list = screens.data?.screens ?? [];
  const groups = (screens.data?.categories ?? []).map((category) => ({
    category, items: list.filter((s) => s.category === category),
  })).filter((g) => g.items.length);
  const meta = run.data?.screen ?? list.find((s) => s.id === screenId);
  const current = view === 'ideas' ? ideas.data : view === 'levels' ? levels.data : run.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <UniversePicker universes={universes} value={universe} onChange={setUniverse} />
        <FreshnessNote asOf={current?.as_of} freshness={current} />
      </div>

      {view === 'ideas' && (
        ideas.loading && !ideas.data ? <CardsLoading />
          : ideas.error && !ideas.data ? <ErrorState error={ideas.error} title="Couldn't load ideas" onRetry={ideas.reload} />
          : ideas.data && <Ideas data={ideas.data} tag={tag} onTag={setTag} />
      )}

      {view === 'levels' && (
        <>
          <Segmented label="Side" value={side} onChange={setSide} options={SIDES} />
          <Method>
            <p>Levels come from a year of closing prices. Turning points are grouped into levels on the daily and weekly charts, then scored by how often, how recently and over how long the price respected them.</p>
            <p>Distance is measured in typical daily moves, so a quiet stock and a jumpy one are judged the same way. A level held many times on both timeframes ranks above a single old touch.</p>
            <p>Closing prices miss intraday wicks, so this list is careful rather than complete.</p>
          </Method>
          {levels.loading && !levels.data ? <CardsLoading tall />
            : levels.error && !levels.data ? <ErrorState error={levels.error} title="Couldn't load levels" onRetry={levels.reload} />
            : levels.data && <Levels data={levels.data} />}
        </>
      )}

      {view === 'screens' && (
        screens.error ? <ErrorState error={screens.error} title="Couldn't load the screens" onRetry={screens.reload} /> : (
          // 17rem: the rail fits the longest screen name without wrapping.
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="lg:hidden">
              <label htmlFor="screen-select" className="mb-1.5 block text-body-sm text-fg-2">Screen</label>
              <Select id="screen-select" value={screenId} onChange={setScreenId}
                      options={groups.flatMap((g) => g.items.map((s) => ({ value: s.id, label: s.name, group: g.category })))} />
            </div>

            <nav aria-label="Screens" className="glass hidden self-start rounded-2xl p-2 lg:block">
              {!screens.data ? <LoadingBlock lines={10} label="Loading screens" className="p-2" /> : groups.map((g) => (
                <div key={g.category} className="pb-1">
                  <p className="px-3 pb-1 pt-3 text-caption text-fg-3">{g.category}</p>
                  {g.items.map((s) => (
                    <button key={s.id} type="button" aria-pressed={s.id === screenId} onClick={() => setScreenId(s.id)}
                            className={clsx('flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-body-sm',
                              s.id === screenId ? 'bg-white/[0.08] text-fg' : 'text-fg-2 hover:bg-white/[0.04] hover:text-fg')}>
                      <span className="truncate">{s.name}</span>
                      {s.id === screenId && run.data?.screen.id === s.id && (
                        <span className="text-caption tabular text-fg-2">{run.data.matched}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <section aria-labelledby="screen-h" className="glass flex min-w-0 flex-col gap-4 self-start rounded-2xl p-5 md:p-6">
              {meta ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id="screen-h" className="text-h4">{meta.name}</h2>
                    <span className={clsx('pill', meta.direction === 'long' ? 'text-up' : 'text-down')}>
                      {meta.direction === 'long' ? 'Long' : 'Short'}
                    </span>
                    <span className="pill text-fg-2">{meta.category}</span>
                  </div>
                  <p className="text-body-sm text-fg-2">{meta.description}</p>
                  <p className="well rounded-lg px-3 py-2 text-caption text-fg-2">{meta.conditions}</p>
                </div>
              ) : <h2 id="screen-h" className="sr-only">Screen results</h2>}
              {run.error && !run.data ? <ErrorState error={run.error} title="Couldn't run this screen" onRetry={run.reload} />
                : !run.data ? <LoadingBlock lines={6} label="Running the screen" />
                : <ScreenResults run={run.data} />}
            </section>
          </div>
        )
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return <Suspense fallback={<CardsLoading />}><DiscoverContent /></Suspense>;
}
