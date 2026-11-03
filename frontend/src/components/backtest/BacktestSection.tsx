'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, RotateCw } from '@/components/ui/icons';
import type { BacktestResult, StrategyInfo } from '../../types/backtest';
import {
  BACKTEST_INTERVALS, BacktestRequest, fetchStrategies, runBacktest,
} from '../../lib/backtest';
import { formatNumber } from '../../lib/format';
import { Button } from '../ui/Button';
import { Field as UiField, inputClass } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Select } from '../ui/Select';
import BacktestResults from './BacktestResults';
import BacktestLab from './BacktestLab';
import { MonteCarloPanel, OosPanel } from './RobustnessPanels';

type Tab = 'report' | 'robustness' | 'lab';

const HOLD_OUT = [
  { id: 'off', label: 'Off' }, { id: '0.2', label: '20%' }, { id: '0.3', label: '30%' }, { id: '0.4', label: '40%' },
];

/**
 * Date presets, as an offset in years from today. `null` is everything the
 * interval can reach — which on daily is four decades, and is the reason this
 * tester exists rather than the one inside a charting site.
 */
const RANGES = [
  { id: 'max', label: 'Max', years: null },
  { id: '10y', label: '10Y', years: 10 },
  { id: '5y', label: '5Y', years: 5 },
  { id: '2y', label: '2Y', years: 2 },
  { id: '1y', label: '1Y', years: 1 },
  { id: 'custom', label: 'Custom', years: undefined },
] as const;

type RangeId = (typeof RANGES)[number]['id'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

function yearsAgo(n: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return iso(d);
}

/** A visible caption over a control that names itself (Select and Segmented take `label`). */
function Field({ label, children, hint }: {
  label: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden="true" className="text-table text-fg-2">{label}</span>
      {children}
      {hint && <p className="text-caption text-fg-3">{hint}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, placeholder, hint }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  step?: number | 'any'; placeholder?: string; hint?: string;
}) {
  const id = useId();
  return (
    <UiField id={id} label={label} hint={hint}>
      <input
        id={id}
        type="number"
        step={step}
        value={value ?? ''}
        placeholder={placeholder ?? 'off'}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputClass}
      />
    </UiField>
  );
}

/** A section that opens below its own button, with the state announced. */
function Disclosure({ id, open, onToggle, children }: {
  id: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={onToggle}
      className="flex min-h-11 items-center gap-1.5 text-body-sm text-fg-2 transition-colors hover:text-fg"
    >
      {children}
      <ChevronDown size={14} aria-hidden="true" className={clsx('transition-transform duration-fast', open && 'rotate-180')} />
    </button>
  );
}

/**
 * The backtester, on the symbol the Terminal is already showing.
 *
 * The engine underneath is the desktop tester's, unchanged: signals form at a
 * bar's close and fill at the next open, costs are charged on both sides, and
 * when a bar contains both a stop and a target the stop is assumed to have hit
 * first. Those three conventions are what separate this from the numbers a
 * charting site's strategy tester will show you for the same idea.
 */
export default function BacktestSection({ symbol, currency }: {
  symbol: string; currency: string;
}) {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [strategyName, setStrategyName] = useState('ema_cross');
  const [interval, setInterval] = useState('1d');
  const [rangeId, setRangeId] = useState<RangeId>('max');
  const [start, setStart] = useState(yearsAgo(5));
  const [end, setEnd] = useState(iso(new Date()));

  const [params, setParams] = useState<Record<string, number | string>>({});
  const [showParams, setShowParams] = useState(false);
  const [showCosts, setShowCosts] = useState(false);

  const [capital, setCapital] = useState(100_000);
  const [commission, setCommission] = useState<number | null>(null);
  const [slippage, setSlippage] = useState<number | null>(null);
  const [sizePct, setSizePct] = useState(100);
  const [allowShort, setAllowShort] = useState(false);
  const [stopPct, setStopPct] = useState<number | null>(null);
  const [targetPct, setTargetPct] = useState<number | null>(null);
  const [trailPct, setTrailPct] = useState<number | null>(null);
  const [atrStop, setAtrStop] = useState<number | null>(null);

  const [oosFrac, setOosFrac] = useState<number | null>(0.3);
  const [monteCarlo, setMonteCarlo] = useState(true);

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('report');
  const abortRef = useRef<AbortController | null>(null);

  const strategy = useMemo(
    () => strategies.find((s) => s.name === strategyName),
    [strategies, strategyName],
  );

  useEffect(() => {
    let live = true;
    fetchStrategies()
      .then((list) => { if (live) setStrategies(list); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);

  // A result is tied to the symbol it was run on; switching tickers has to
  // drop it, or the report would describe a different stock than the chart.
  const [runSymbol, setRunSymbol] = useState(symbol);
  if (runSymbol !== symbol) {
    setRunSymbol(symbol);
    setResult(null);
    setError('');
    setRunning(false);
  }
  // ...and abort the old symbol's run (also on unmount).
  useEffect(() => () => { abortRef.current?.abort(); abortRef.current = null; }, [symbol]);

  const buildRequest = useCallback((): BacktestRequest => {
    const preset = RANGES.find((r) => r.id === rangeId);
    const dates =
      rangeId === 'custom' ? { start, end }
      : preset?.years ? { start: yearsAgo(preset.years) }
      : {};
    return {
      symbol,
      strategy: strategyName,
      interval,
      ...dates,
      params,
      capital,
      ...(commission !== null ? { commission_bps: commission } : {}),
      ...(slippage !== null ? { slippage_bps: slippage } : {}),
      size_pct: sizePct,
      allow_short: allowShort,
      stop_loss_pct: stopPct,
      take_profit_pct: targetPct,
      trailing_stop_pct: trailPct,
      atr_stop_mult: atrStop,
    };
  }, [symbol, strategyName, interval, rangeId, start, end, params, capital,
      commission, slippage, sizePct, allowShort, stopPct, targetPct, trailPct, atrStop]);

  const run = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true); setError(''); setTab('report');
    try {
      const out = await runBacktest(
        { ...buildRequest(), oos_frac: oosFrac, monte_carlo: monteCarlo },
        controller.signal,
      );
      setResult(out);
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        setError(e instanceof Error ? e.message : 'The backtest could not be run.');
      }
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const intervalMeta = BACKTEST_INTERVALS.find((t) => t.id === interval);
  const ownCosts = strategy?.costs?.commission_bps != null;

  const TABS: { id: Tab; label: string; enabled: boolean }[] = [
    { id: 'report', label: 'Report', enabled: !!result },
    { id: 'robustness', label: 'Robustness', enabled: !!result },
    { id: 'lab', label: 'Optimizer and walk-forward', enabled: !!strategy },
  ];

  return (
    <div className="space-y-5">
      {/* ---- Header and controls ---- */}
      <div className="glass rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-h4 text-fg">Backtest</h3>
            <p className="mt-1 max-w-prose text-body-sm text-fg-2">
              Test a strategy on every bar Yahoo has for {symbol}. Signals form at a bar&apos;s close and
              fill at the next open, costs are charged both ways, and when one bar hits both a stop and a
              target the stop counts first.
            </p>
          </div>

          {running ? (
            <Button variant="secondary" onClick={stop}>Stop</Button>
          ) : (
            <Button onClick={run} disabled={!strategies.length}>
              {result ? 'Run again' : `Backtest ${symbol}`}
            </Button>
          )}
        </div>

        {/* ---- Primary controls ---- */}
        <div className="mt-5 grid grid-cols-1 gap-x-4 gap-y-5 border-t border-line pt-5 md:grid-cols-2">
          <Field label="Strategy" hint={strategy?.doc}>
            <Select
              label="Strategy"
              value={strategyName}
              onChange={(v) => {
                setStrategyName(v);
                // Parameters belong to a strategy: never carry a stale
                // `fast=10` onto something with no `fast` at all.
                setParams({});
              }}
              options={strategies.map((s) => ({ value: s.name, label: s.name }))}
            />
          </Field>

          <Field label="Interval" hint={intervalMeta?.coverage}>
            <Select label="Interval" value={interval} onChange={setInterval}
                    options={BACKTEST_INTERVALS.map((t) => ({ value: t.id, label: t.label }))} />
          </Field>

          <Field
            label="Date range"
            hint={result?.range_clamped
              ? `Limited to ${result.range} because this interval cannot reach further back`
              : undefined}
          >
            <Segmented label="Date range" value={rangeId} onChange={setRangeId}
                       options={RANGES.map((r) => ({ id: r.id, label: r.label }))} />
          </Field>

          <Field label="Out-of-sample hold-out" hint="Fit nothing to the tail, then look once">
            <Segmented label="Out-of-sample hold-out" options={HOLD_OUT}
                       value={oosFrac === null ? 'off' : String(oosFrac)}
                       onChange={(id) => setOosFrac(id === 'off' ? null : Number(id))} />
          </Field>
        </div>

        {rangeId === 'custom' && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <UiField id="bt-from" label="From">
              <input id="bt-from" type="date" value={start} max={end}
                     onChange={(e) => setStart(e.target.value)} className={inputClass} />
            </UiField>
            <UiField id="bt-to" label="To">
              <input id="bt-to" type="date" value={end} min={start} max={iso(new Date())}
                     onChange={(e) => setEnd(e.target.value)} className={inputClass} />
            </UiField>
          </div>
        )}

        {/* ---- Execution model ---- */}
        <div className="mt-4 border-t border-line pt-2">
          <Disclosure id="bt-costs" open={showCosts} onToggle={() => setShowCosts((v) => !v)}>
            Costs, sizing and stops
          </Disclosure>
          {showCosts && (
            <div id="bt-costs" className="mt-2 grid grid-cols-1 gap-4 rounded-xl well p-4 sm:grid-cols-2 lg:grid-cols-4">
              <NumberField label="Capital" value={capital} step={1000}
                           onChange={(v) => setCapital(v ?? 100_000)} placeholder="100000" />
              <NumberField
                label="Commission (bps/side)" value={commission} step="any"
                onChange={setCommission}
                placeholder={ownCosts ? String(strategy?.costs.commission_bps) : '3'}
                hint={ownCosts ? "the strategy's own" : undefined}
              />
              <NumberField
                label="Slippage (bps/side)" value={slippage} step="any" onChange={setSlippage}
                placeholder={ownCosts ? String(strategy?.costs.slippage_bps) : '2'}
              />
              <NumberField label="Size (% of equity)" value={sizePct} step="any"
                           onChange={(v) => setSizePct(v ?? 100)} placeholder="100" />
              <NumberField label="Stop loss %" value={stopPct} step="any" onChange={setStopPct} />
              <NumberField label="Take profit %" value={targetPct} step="any" onChange={setTargetPct} />
              <NumberField label="Trailing stop %" value={trailPct} step="any" onChange={setTrailPct} />
              <NumberField label="ATR stop (×)" value={atrStop} step="any" onChange={setAtrStop}
                           hint="overrides stop loss %" />
              <div className="flex flex-wrap gap-x-6 sm:col-span-2 lg:col-span-4">
                <label className="inline-flex min-h-11 items-center gap-2 text-body-sm text-fg-2">
                  <input type="checkbox" checked={allowShort} className="h-4 w-4 accent-fg-2"
                         onChange={(e) => setAllowShort(e.target.checked)} />
                  Allow short entries
                </label>
                <label className="inline-flex min-h-11 items-center gap-2 text-body-sm text-fg-2">
                  <input type="checkbox" checked={monteCarlo} className="h-4 w-4 accent-fg-2"
                         onChange={(e) => setMonteCarlo(e.target.checked)} />
                  Monte Carlo resample
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ---- Strategy parameters ---- */}
        {strategy && strategy.params.length > 0 && (
          <div>
            <Disclosure id="bt-params" open={showParams} onToggle={() => setShowParams((v) => !v)}>
              {strategy.name} parameters ({strategy.params.length})
            </Disclosure>
            {showParams && (
              <div id="bt-params" className="mt-2 grid grid-cols-2 gap-4 rounded-xl well p-4 sm:grid-cols-3 lg:grid-cols-4">
                {strategy.params.map((p) => (
                  <div key={p.name} className="flex min-w-0 flex-col gap-1.5">
                    <label htmlFor={`bt-param-${p.name}`} className="truncate text-table text-fg-2">{p.name}</label>
                    <input
                      id={`bt-param-${p.name}`}
                      type={p.type === 'string' ? 'text' : 'number'}
                      step={p.type === 'int' ? 1 : 'any'}
                      value={params[p.name] ?? ''}
                      placeholder={String(p.default)}
                      onChange={(e) => setParams((prev) => {
                        const next = { ...prev };
                        if (e.target.value === '') delete next[p.name];
                        else next[p.name] = p.type === 'string' ? e.target.value : Number(e.target.value);
                        return next;
                      })}
                      className={inputClass}
                    />
                  </div>
                ))}
                <p className="col-span-2 text-caption text-fg-3 sm:col-span-3 lg:col-span-4">
                  Blank uses the default shown. Booleans take 1 or 0.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-down/25 bg-down/[0.06] p-3 text-body-sm text-down">
            {error}
          </p>
        )}

        {running && (
          <p role="status" className="mt-4 flex items-center gap-2 text-body-sm text-fg-2">
            <RotateCw size={14} aria-hidden="true" />
            Pulling history and simulating every bar. Decades of daily bars take a few seconds.
          </p>
        )}

        {result && !running && (
          <p className="mt-4 border-t border-line pt-3 text-caption text-fg-3">
            {formatNumber(result.bars, 0)} bars · {result.summary.n_trades} trades ·{' '}
            {result.config.commission_bps as number} + {result.config.slippage_bps as number} bps
            per side · simulated in {formatNumber(result.elapsed_ms / 1000, 1)} s
          </p>
        )}
      </div>

      {/* ---- Views ---- */}
      {(result || strategy) && (
        <>
          <Segmented label="Backtest view" value={tab} onChange={setTab}
                     options={TABS.filter((t) => t.enabled).map((t) => ({ id: t.id, label: t.label }))} />

          {tab === 'report' && result && (
            <BacktestResults result={result} currency={currency} />
          )}

          {tab === 'robustness' && result && (
            <div className="space-y-4">
              {result.oos
                ? <OosPanel oos={result.oos} />
                : <p className="text-[12px] text-fg-3">
                    Turn the out-of-sample hold-out on and run again to see the split.
                  </p>}
              {result.monte_carlo && <MonteCarloPanel mc={result.monte_carlo} />}
            </div>
          )}

          {tab === 'lab' && strategy && (
            <BacktestLab key={strategy.name} base={buildRequest()} strategy={strategy} />
          )}
        </>
      )}
    </div>
  );
}
