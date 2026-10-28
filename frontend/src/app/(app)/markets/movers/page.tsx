'use client';

import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { Panel } from '@/components/PageHeader';
import { BreadthBar } from '@/components/home/MarketBreadth';
import { Method } from '@/components/markets/Method';
import { MoverTable, type MoverItem } from '@/components/markets/MoverTable';
import { AlertTriangle, Loader2 } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { formatNumber, formatPct } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import type { CircuitConfidence, MoverRow, MoversResponse, ScopeMeta } from '@/types/movers';

type Board = 'top' | 'circuits' | 'size' | 'intraday';
const BOARDS: { id: Board; label: string }[] = [
  { id: 'top', label: 'Top movers' },
  { id: 'circuits', label: 'Circuits' },
  { id: 'size', label: 'By size' },
  { id: 'intraday', label: 'Intraday' },
];
const MOVES = ['2', '5', '10', '15', '20'];
const ROWS = 15;
/** Poll while the backend is still pricing the market, so a partial board fills in. */
const POLL_MS = 4000;

// Until the first response lists the real scopes with their counts.
const FALLBACK_SCOPES: ScopeMeta[] = [
  { id: 'allnse', label: 'All NSE equity', kind: 'all', group: 'index', count: 0 },
  { id: 'totalmarket', label: 'NIFTY Total Market', kind: 'index', group: 'index', count: 0 },
  { id: 'nifty50', label: 'NIFTY 50', kind: 'index', group: 'index', count: 0 },
  { id: 'largecap', label: 'Largecap', kind: 'segment', group: 'segment', count: 0 },
  { id: 'midcap', label: 'Midcap', kind: 'segment', group: 'segment', count: 0 },
  { id: 'smallcap', label: 'Smallcap', kind: 'segment', group: 'segment', count: 0 },
  { id: 'microcap', label: 'Microcap', kind: 'segment', group: 'segment', count: 0 },
];

const CONFIDENCE: Record<CircuitConfidence, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'text-fg-2' },
  inferred: { label: 'Likely', className: 'text-warn' },
  unverified: { label: 'Not checked yet', className: 'text-fg-3' },
};

const toItem = (r: MoverRow, extra?: ReactNode): MoverItem => ({
  key: r.yahoo, symbol: r.symbol, href: `/s/${encodeURIComponent(r.yahoo)}`, name: r.name,
  price: r.price, currency: r.currency, change: r.change_pct, tags: r.fno ? ['F&O'] : undefined, extra,
});

function Stack({ top, bottom, bottomClass = 'text-fg-3' }: { top: ReactNode; bottom: ReactNode; bottomClass?: string }) {
  return (
    <span className="flex flex-col items-end">
      <span>{top}</span>
      <span className={clsx('text-caption', bottomClass)}>{bottom}</span>
    </span>
  );
}

function Note({ warn = false, children }: { warn?: boolean; children: ReactNode }) {
  return (
    <p className={clsx('flex items-start gap-2 rounded-xl border px-4 py-3 text-body-sm text-fg-2',
      warn ? 'border-warn/30 bg-warn/[0.06]' : 'border-white/15 bg-white/[0.04]')}>
      {children}
    </p>
  );
}

function Movers() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const board = BOARDS.find((b) => b.id === params.get('board'))?.id ?? 'top';
  // The widest scope by default: 20% circuits are almost never index members.
  const scope = params.get('scope') || 'allnse';
  const move = MOVES.find((m) => m === params.get('move')) ?? '5';
  const minMove = Number(move);

  const [warming, setWarming] = useState(false);
  const { data, error, loading, reload } = useApi<MoversResponse>(
    `/api/movers?scope=${encodeURIComponent(scope)}&min_move=${move}&limit=${ROWS}`,
    { refreshMs: warming ? POLL_MS : undefined },
  );
  if (Boolean(data?.warming) !== warming) setWarming(Boolean(data?.warming));
  const [scopes, setScopes] = useState(FALLBACK_SCOPES);
  if (data?.scopes?.length && data.scopes !== scopes) setScopes(data.scopes);

  const scopeOptions = [...scopes]
    .sort((a, b) => (a.group === b.group ? 0 : a.group === 'index' ? -1 : 1))
    .map((s) => ({
      value: s.id, group: s.group === 'index' ? 'Index' : 'Size group',
      label: s.count ? `${s.label} (${formatNumber(s.count, 0, 'INR')})` : s.label,
    }));

  const gainers = data?.gainers.filter((r) => r.change_pct >= minMove) ?? [];
  const losers = data?.losers.filter((r) => r.change_pct <= -minMove) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Segmented label="Board" value={board} onChange={(v) => set('board', v)} options={BOARDS} />

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex w-full flex-col gap-1.5 sm:w-80">
          <label htmlFor="movers-scope" className="text-body-sm text-fg-2">Stocks</label>
          <Select id="movers-scope" value={scope} onChange={(v) => set('scope', v)} options={scopeOptions} />
        </div>
        {(board === 'top' || board === 'size') && (
          <div className="flex flex-col gap-1.5">
            <span aria-hidden="true" className="text-body-sm text-fg-2">Moved at least</span>
            <Segmented label="Moved at least" value={move} onChange={(v) => set('move', v)}
                       options={MOVES.map((m) => ({ id: m, label: `${m}%` }))} />
          </div>
        )}
      </div>

      {data?.warming && (
        <Note>
          <Loader2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 animate-spin motion-reduce:animate-none" />
          <span>
            {data.warm_progress?.phase === 'intraday' ? 'Measuring intraday ranges for the biggest movers' : 'Still pricing the market'}
            {data.warm_progress && ` (${data.warm_progress.done} of ${data.warm_progress.total} batches)`}.
            {' '}Showing {formatNumber(data.priced, 0, 'INR')} stocks so far, so this board is incomplete.
          </span>
        </Note>
      )}
      {data && data.excluded_implausible > 0 && (
        <Note>
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-fg-3" />
          <span>
            Left out {data.excluded_implausible} {data.excluded_implausible === 1 ? 'stock that' : 'stocks that'} moved
            more than {data.sanity_max_move_pct}%. The widest NSE band is 20%, so these are most likely splits or
            bonuses the price data has not adjusted yet
            {data.excluded_examples.length > 0 && `, for example ${data.excluded_examples
              .map((e) => `${e.symbol} ${formatPct(e.change_pct, 1)}`).join(', ')}`}.
          </span>
        </Note>
      )}
      {data?.warnings.map((w) => (
        <Note key={w} warn>
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warn" />
          <span>{w}.</span>
        </Note>
      ))}

      {loading && !data ? <LoadingBlock lines={8} label="Loading movers" className="glass rounded-2xl p-6" />
        : error && !data ? <ErrorState error={error} title="Couldn't load movers" onRetry={reload} />
        : data && (
          <>
            <section aria-labelledby="movers-h" className="glass flex flex-col gap-4 rounded-2xl p-5 md:p-6">
              <div className="flex flex-col gap-1">
                <h2 id="movers-h" className="text-body-sm text-fg-2">
                  {data.scope_label}{data.as_of && `, session of ${data.as_of}`}
                </h2>
                <p className="text-figure tabular">
                  {formatNumber(data.big_mover_count, 0, 'INR')}{' '}
                  <span className="text-h4 text-fg-2">moved {move}% or more</span>
                </p>
              </div>
              <BreadthBar b={{
                universe: data.scope_label, advancing: data.breadth.advancing, declining: data.breadth.declining,
                unchanged: data.breadth.unchanged, priced: data.priced, scanned: data.scanned,
                coverage_pct: data.coverage_pct, partial: data.partial,
              }} />
            </section>

            {board === 'top' && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel level={2} id="gainers-h" title="Gainers" aside={`Up ${move}% or more`}>
                  {gainers.length ? <MoverTable items={gainers.map((r) => toItem(r))} caption={`Gainers in ${data.scope_label}`} />
                    : <p className="text-body-sm text-fg-2">Nothing here is up {move}% or more yet.</p>}
                </Panel>
                <Panel level={2} id="losers-h" title="Losers" aside={`Down ${move}% or more`}>
                  {losers.length ? <MoverTable items={losers.map((r) => toItem(r))} caption={`Losers in ${data.scope_label}`} />
                    : <p className="text-body-sm text-fg-2">Nothing here is down {move}% or more yet.</p>}
                </Panel>
              </div>
            )}

            {board === 'circuits' && (
              <>
                <Method>
                  <p>NSE does not publish each stock&apos;s price band in any feed Polaris can read, so a hit is worked out from the close. A stock that closes at a standard band of {data.circuits.bands.join(', ')} percent is listed.</p>
                  <p>Where the day&apos;s 5-minute prices are loaded, a close pinned at the day&apos;s high or low confirms it. Likely means the close sits on a band but the 5-minute prices do not show a lock. The 2 percent band is left out because too many ordinary closes land on it.</p>
                </Method>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {(['upper', 'lower'] as const).map((side) => {
                    const rows = data.circuits[side];
                    return (
                      <Panel key={side} level={2} id={`${side}-h`} title={side === 'upper' ? 'Upper circuit' : 'Lower circuit'}
                             aside={`${side === 'upper' ? data.circuits.upper_count : data.circuits.lower_count} stocks`}>
                        {rows.length ? (
                          <MoverTable extraLabel="Band" caption={`${side === 'upper' ? 'Upper' : 'Lower'} circuit hits`}
                                      items={rows.slice(0, 20).map((r) => {
                                        const c = CONFIDENCE[r.circuit_confidence ?? 'unverified'];
                                        return toItem(r, <Stack top={`${r.circuit_band}%`} bottom={c.label} bottomClass={c.className} />);
                                      })} />
                        ) : (
                          <p className="text-body-sm text-fg-2">
                            {side === 'upper' ? 'No stock closed at an upper circuit today.' : 'No stock closed at a lower circuit today.'}
                          </p>
                        )}
                      </Panel>
                    );
                  })}
                </div>
              </>
            )}

            {board === 'size' && (
              <>
                <Method>
                  <p>Each NSE size group is ranked on its own, so a 4% day in a large company is not buried under a 20% day in a tiny one. Membership comes from NSE&apos;s own index lists.</p>
                  <p>Unranked means the company trades on NSE but sits outside every NSE size index. Most 20% circuit days happen there.</p>
                </Method>
                {data.segments.length ? (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {data.segments.map((s) => (
                      <Panel key={s.segment} level={2} id={`seg-${s.segment}-h`} title={s.label}
                             aside={`${s.advancing} up, ${s.declining} down`}>
                        {s.movers.length ? <MoverTable items={s.movers.map((r) => toItem(r))} caption={`Biggest moves, ${s.label}`} />
                          : <p className="text-body-sm text-fg-2">Nothing priced in this group yet.</p>}
                      </Panel>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={`No size group has a stock that moved ${move}% or more yet`}>
                    The scan may still be filling in. Try a lower threshold.
                  </EmptyState>
                )}
              </>
            )}

            {board === 'intraday' && (
              <>
                <Method>
                  <p>Only stocks you can trade intraday (MIS) are listed. The range is the day&apos;s high minus its low, as a share of the previous close, from {data.intraday.interval} prices.</p>
                  <p>Measuring every eligible stock would take too many requests, so the {data.intraday.enrich_cap} biggest movers are measured and the rest use their daily move. Bars counts the {data.intraday.interval} periods that traded, and a handful usually means the stock was locked at a band.</p>
                </Method>
                <Panel level={2} id="intraday-h"
                       title={data.intraday.ranked_by === 'intraday_range_pct' ? 'Widest intraday range' : 'Biggest daily move'}
                       aside={`${formatNumber(data.intraday.eligible_count, 0, 'INR')} can be traded intraday`}>
                  {data.intraday.rows.length ? (
                    <MoverTable extraLabel="Range" caption="Stocks by intraday range"
                                items={data.intraday.rows.slice(0, 20).map((r) => toItem(r, r.intraday_range_pct !== undefined
                                  ? <Stack top={`${formatNumber(r.intraday_range_pct, 2)}%`} bottom={`${r.bars} bars`} />
                                  : <span className="text-caption text-fg-3">Not measured</span>))} />
                  ) : <p className="text-body-sm text-fg-2">No intraday-eligible stock is priced in this list yet.</p>}
                </Panel>
              </>
            )}

            <p className="text-caption text-fg-3">
              Prices are end-of-day closes, not live ticks, and intraday figures use 5-minute prices. F&amp;O means
              futures and options trade on the stock. All trading here is paper.
            </p>
          </>
        )}
    </div>
  );
}

export default function MoversPage() {
  return <Suspense fallback={<LoadingBlock lines={8} label="Loading movers" />}><Movers /></Suspense>;
}
