'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import Chart from '@/components/Chart';
import { AlertSheet, describeAlert } from '@/components/alerts/AlertSheet';
import { NavAlerts } from '@/components/ui/icons';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { readStorage, useBrowserValue, useMediaQuery, writeStorage } from '@/lib/browser';
import { useApi } from '@/lib/useApi';
import type { Alert, AlertKind } from '@/types/api';
import type { QuantLevels } from '@/types/quant';

/** Each range loads extra history so long overlays (EMA 200) are warmed up at the left edge. */
const TIMEFRAMES = [
  { id: '5m', label: '5m', range: '1mo', visibleBars: 375 },
  { id: '15m', label: '15m', range: '1mo', visibleBars: 250 },
  { id: '60m', label: '1h', range: '2y', visibleBars: 500 },
  { id: '1d', label: '1D', range: '5y', visibleBars: 252 },
  { id: '1wk', label: '1W', range: 'max', visibleBars: 260 },
] as const;
type TfId = (typeof TIMEFRAMES)[number]['id'];

type Bar = { time: string | number; open: number; high: number; low: number; close: number };
type ChartResponse = { quotes: (Bar & { volume: number })[]; range_clamped: boolean; range: string; requested_range: string; interval: string };

const PLAN_KEY = 'flint.chart.plan-lines.v1';

export function ChartPanel({ symbol, levels }: { symbol: string; levels?: QuantLevels }) {
  const toast = useToast();
  const [tf, setTf] = useState<TfId>('1d');
  const height = useMediaQuery('(max-width: 767px)') ? 320 : 480;
  const storedPlan = useBrowserValue(() => readStorage(PLAN_KEY) !== 'off', true);
  const [planOverride, setPlanOverride] = useState<boolean | null>(null);
  const showPlan = planOverride ?? storedPlan;
  const frame = TIMEFRAMES.find((t) => t.id === tf)!;
  const { data, error, loading, reload } = useApi<ChartResponse>(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&interval=${frame.id}&range=${frame.range}`,
  );
  const alerts = useApi<{ alerts: Alert[] }>('/api/alerts');
  const [sheet, setSheet] = useState<{ open: boolean; kind?: AlertKind; threshold?: string }>({ open: false });

  const togglePlan = () => {
    const next = !showPlan;
    writeStorage(PLAN_KEY, next ? 'on' : 'off');
    setPlanOverride(next);
  };

  const bars = useMemo(() => {
    const key = (t: string | number) => (typeof t === 'number' ? t : new Date(t).getTime() / 1000);
    const sorted = (data?.quotes ?? [])
      .filter((q) => q.open != null && q.close != null && q.time != null)
      .map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
      .sort((a, b) => key(a.time) - key(b.time));
    return sorted.filter((b, i) => i === 0 || b.time !== sorted[i - 1].time);
  }, [data]);
  const lastClose = bars.at(-1)?.close;

  // From a chart price: above the last close means "rises to", below means "falls to".
  const addAlert = (price?: number) => setSheet({
    open: true,
    threshold: price === undefined ? undefined : String(price),
    kind: price !== undefined && lastClose !== undefined && price < lastClose ? 'price_below' : 'price_above',
  });

  const priceLines = useMemo(() => {
    const plan = showPlan && levels ? ([
      { price: levels.entry, color: '--fg', lineStyle: 0, lineWidth: 2, title: 'Entry' },
      { price: levels.stop_loss, color: '--red', lineStyle: 3, lineWidth: 2, title: 'Stop' },
      { price: levels.target_1, color: '--green', lineStyle: 3, lineWidth: 1, title: 'T1' },
      { price: levels.target_2, color: '--green', lineStyle: 3, lineWidth: 2, title: 'T2' },
    ] as const).filter((l) => l.price != null) : [];
    // Live price alerts on this symbol, dashed, so the chart shows what is waiting to fire.
    const waiting = (alerts.data?.alerts ?? [])
      .filter((a) => a.status === 'active' && a.kind !== 'move_pct' && a.symbol.toUpperCase() === symbol.toUpperCase())
      .map((a) => ({ price: Number(a.threshold), color: '--fg-2', lineStyle: 2, lineWidth: 1, title: 'Alert' } as const));
    const lines = [...plan, ...waiting].map((l) => ({ ...l, axisLabelVisible: true }));
    return lines.length ? lines : undefined;
  }, [levels, showPlan, alerts.data, symbol]);

  return (
    <section aria-label="Price chart" className="glass flex flex-col gap-3 rounded-2xl p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Timeframe" className="flex overflow-hidden rounded-sm border border-white/15 bg-black/30">
          {TIMEFRAMES.map((t) => (
            <button key={t.id} type="button" aria-pressed={tf === t.id} onClick={() => setTf(t.id)}
                    className={clsx('min-h-9 min-w-11 px-2 text-table tabular',
                      tf === t.id ? 'bg-fg text-ink-0' : 'text-fg-2 hover:text-fg')}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {levels && (
            <button type="button" aria-pressed={showPlan} onClick={togglePlan}
                    className="min-h-9 px-2 text-table text-fg-2 underline-offset-4 hover:text-fg hover:underline">
              {showPlan ? 'Hide plan lines' : 'Show plan lines'}
            </button>
          )}
          <button type="button" onClick={() => addAlert()}
                  className="flex min-h-9 items-center gap-1.5 px-2 text-table text-fg-2 hover:text-fg">
            <NavAlerts size={16} aria-hidden="true" /> Add alert
          </button>
        </div>
      </div>
      {data?.range_clamped && (
        <p className="text-caption text-fg-3">
          {data.interval} history is limited to {data.range} by the data provider (you asked for {data.requested_range}).
        </p>
      )}
      <div style={{ minHeight: height }}>
        {loading && !bars.length ? <Skeleton className="w-full" style={{ height }} />
          : error ? <ErrorState error={error} title="Couldn't load the chart" onRetry={reload} />
          : bars.length ? (
            <Chart data={bars as Parameters<typeof Chart>[0]['data']} visibleBars={frame.visibleBars} height={height} symbol={symbol}
                   colors={{ priceLines }} onAddAlert={addAlert} />
          ) : <p className="py-12 text-center text-body-sm text-fg-2">No price history for this timeframe.</p>}
      </div>
      <p className="hidden text-caption text-fg-3 lg:block">
        Right-click the chart to set an alert at that price. Your alerts show as dashed lines.
      </p>
      <AlertSheet open={sheet.open} initialSymbol={symbol} initialKind={sheet.kind} initialThreshold={sheet.threshold}
                  onClose={() => setSheet((s) => ({ ...s, open: false }))}
                  onSaved={(saved) => { alerts.reload(); toast.show({ message: `Alert set. ${describeAlert(saved)}.` }); }} />
    </section>
  );
}
