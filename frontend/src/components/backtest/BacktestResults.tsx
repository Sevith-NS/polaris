'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Layers, ListOrdered, Ruler, TrendingUp } from '@/components/ui/icons';
import { Change } from '@/components/ui/Change';
import type { BacktestResult, MonthlyRow, Num, TradeRow } from '../../types/backtest';
import { money, num, pct, ratio, shortDate, signedPct, toneFor } from '../../lib/backtest';
import { formatNumber } from '../../lib/format';
import EquityChart from './EquityChart';
import { tint } from '../../lib/theme';

/* ------------------------------------------------------------------ atoms */

const asPct = (v: Num) => (v === null || v === undefined ? null : v * 100);

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 lg:px-5 lg:first:pl-0">
      <dt className="text-caption text-fg-3">{label}</dt>
      <dd className="text-body font-medium tabular text-fg">{children}</dd>
    </div>
  );
}

/**
 * The answer first: did the rules beat simply holding, and at what cost. A
 * positive return that lost to buy and hold is not a win, so the headline is
 * the comparison, not the return.
 */
function Verdict({ result, currency }: { result: BacktestResult; currency: string }) {
  const s = result.summary;
  const gap = s.alpha_cagr;
  const headline = gap === null || gap === undefined || s.bh_cagr === null || s.bh_cagr === undefined
    ? 'There is no buy and hold comparison for this range.'
    : gap > 0.0005 ? `The strategy beat buy and hold by ${formatNumber(gap * 100, 1)} points a year.`
    : gap < -0.0005 ? `Buy and hold did better, by ${formatNumber(-gap * 100, 1)} points a year.`
    : 'The strategy matched buy and hold.';
  return (
    <section aria-labelledby="bt-verdict" className="glass rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-md border border-warn/50 bg-warn/10 px-1.5 py-0.5 text-micro uppercase text-warn">In-sample</span>
        <span className="text-caption text-fg-3">
          {shortDate(s.start)} to {shortDate(s.end)} · {num(s.years, 1)} years · {formatNumber(result.bars, 0)} bars
        </span>
      </div>
      <h3 id="bt-verdict" className="mt-3 text-h4 text-fg">{headline}</h3>
      <p className="mt-1 max-w-prose text-body-sm text-fg-2">
        {money(s.initial, currency)} became {money(s.final, currency)} with the strategy, which was in the
        market {pct(s.exposure, 0)} of the time.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:divide-x lg:divide-line">
        <Stat label="Strategy, a year"><Change pct={asPct(s.cagr)} /></Stat>
        <Stat label="Buy and hold, a year"><Change pct={asPct(s.bh_cagr)} /></Stat>
        <Stat label="Worst drop"><Change pct={asPct(s.max_dd)} /></Stat>
        <Stat label="Buy and hold worst drop"><Change pct={asPct(s.bh_max_dd)} /></Stat>
        <Stat label="Sharpe">{num(s.sharpe)}</Stat>
        <Stat label="Trades">{s.n_trades} · {pct(s.win_rate, 0)} won</Stat>
      </dl>
      <p className="mt-4 text-caption text-fg-3">
        In-sample means these figures come from the same history the rules are judged on, so they flatter
        the rules. Robustness shows the part held out of sight.
      </p>
    </section>
  );
}

function Line({ label, value, tone, title }: {
  label: string; value: React.ReactNode; tone?: string; title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1" title={title}>
      <span className="text-caption text-fg-3">{label}</span>
      <span className={clsx('text-[12px] font-medium tabular', tone ?? 'text-fg')}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, icon, children }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl well p-4">
      <h4 className="mb-2 flex items-center gap-1.5 border-b border-line pb-2 text-caption text-fg-3">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

/* ------------------------------------------------------- monthly returns */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Colour scaled against the best and worst month in THIS run, not a fixed
 * range: a scale pinned to ±10% renders an intraday strategy's whole grid a
 * uniform grey, and one pinned to ±1% renders a decade of daily bars solid.
 */
function monthTint(value: Num, extreme: number): string | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  const weight = Math.min(Math.abs(value) / (extreme || 1), 1) * 55 + 6;
  return tint(value >= 0 ? 'var(--green)' : 'var(--red)', Math.round(weight));
}

function MonthlyGrid({ rows }: { rows: MonthlyRow[] }) {
  if (!rows.length) {
    return <p className="text-caption text-fg-3">Not enough history for a monthly grid.</p>;
  }
  const extreme = rows.reduce((m, r) => {
    const vals = Object.values(r.months).filter((v): v is number => typeof v === 'number');
    return Math.max(m, ...vals.map(Math.abs), 0);
  }, 0);

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-[2px] text-caption tabular">
        <thead>
          <tr className="text-fg-3">
            <th className="text-left font-normal">Year</th>
            {MONTHS.map((m) => <th key={m} className="font-normal">{m}</th>)}
            <th className="font-normal">Year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <td className="pr-1 text-left text-fg-2">{row.year}</td>
              {MONTHS.map((m) => {
                const v = row.months[m];
                return (
                  <td
                    key={m}
                    className="rounded px-1 py-1 text-center text-fg"
                    style={{ background: monthTint(v, extreme) }}
                  >
                    {typeof v === 'number' ? (v * 100).toFixed(1) : ''}
                  </td>
                );
              })}
              <td className={clsx('rounded border border-line px-1 py-1 text-center font-semibold',
                                  toneFor(row.total))}>
                {typeof row.total === 'number' ? `${(row.total * 100).toFixed(1)}` : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 px-1 text-caption text-fg-3">Figures are percent returns.</p>
    </div>
  );
}

/* ------------------------------------------------------------- trade log */

const PAGE = 25;

function TradeTable({ trades, currency }: {
  trades: { rows: TradeRow[]; total: number; truncated: boolean }; currency: string;
}) {
  const [shown, setShown] = useState(PAGE);
  if (!trades.rows.length) {
    return <p className="text-caption text-fg-3">This strategy took no trades on these bars.</p>;
  }
  // Newest first: the most recent trades are the ones being reasoned about.
  const ordered = [...trades.rows].reverse();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-caption tabular">
          <thead>
            <tr className="border-b border-line text-left text-caption text-fg-3">
              <th className="py-1.5 pr-2 font-normal">Side</th>
              <th className="py-1.5 pr-2 font-normal">Entry</th>
              <th className="py-1.5 pr-2 text-right font-normal">Price</th>
              <th className="py-1.5 pr-2 font-normal">Exit</th>
              <th className="py-1.5 pr-2 text-right font-normal">Price</th>
              <th className="py-1.5 pr-2 text-right font-normal">Bars</th>
              <th className="py-1.5 pr-2 text-right font-normal" title="Return on the capital committed">Return</th>
              <th className="py-1.5 pr-2 text-right font-normal">P&amp;L</th>
              <th className="py-1.5 pr-2 text-right font-normal" title="Worst adverse excursion while open">MAE</th>
              <th className="py-1.5 pr-2 text-right font-normal" title="Best favourable excursion while open">MFE</th>
              <th className="py-1.5 font-normal">Exit reason</th>
            </tr>
          </thead>
          <tbody>
            {ordered.slice(0, shown).map((t, i) => (
              <tr key={`${t.entry_time}-${i}`} className="border-b border-line/50">
                <td className="py-1.5 pr-2">
                  <span className={t.direction > 0 ? 'text-up' : 'text-down'}>
                    {t.direction > 0 ? 'LONG' : 'SHORT'}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-fg-2">{shortDate(t.entry_time)}</td>
                <td className="py-1.5 pr-2 text-right text-fg-2">{num(t.entry_price)}</td>
                <td className="py-1.5 pr-2 text-fg-2">{shortDate(t.exit_time)}</td>
                <td className="py-1.5 pr-2 text-right text-fg-2">{num(t.exit_price)}</td>
                <td className="py-1.5 pr-2 text-right text-fg-3">{t.bars_held}</td>
                <td className={clsx('py-1.5 pr-2 text-right font-semibold', toneFor(t.ret_pct))}>
                  {t.ret_pct === null ? '–' : `${t.ret_pct > 0 ? '+' : ''}${t.ret_pct.toFixed(2)}%`}
                </td>
                <td className={clsx('py-1.5 pr-2 text-right', toneFor(t.pnl))}>
                  {money(t.pnl, currency)}
                </td>
                <td className="py-1.5 pr-2 text-right text-down/80">
                  {t.mae_pct === null ? '–' : `${t.mae_pct.toFixed(1)}%`}
                </td>
                <td className="py-1.5 pr-2 text-right text-up/80">
                  {t.mfe_pct === null ? '–' : `+${t.mfe_pct.toFixed(1)}%`}
                </td>
                <td className="py-1.5 text-caption text-fg-3">{t.exit_reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-caption text-fg-3">
        <span>
          Showing {Math.min(shown, ordered.length)} of {trades.total}
          {trades.truncated && ' (log capped at 2,000)'}
        </span>
        {shown < ordered.length && (
          <button
            type="button"
            onClick={() => setShown((s) => s + PAGE * 4)}
            className="rounded-sm border border-white/25 px-2 py-1 text-fg-2 transition-colors hover:text-fg"
          >
            Show more
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- report */

export default function BacktestResults({ result, currency }: {
  result: BacktestResult; currency: string;
}) {
  const s = result.summary;
  const e = result.extended;
  const bench = e.benchmark;

  return (
    <div className="space-y-4">
      <Verdict result={result} currency={currency} />

      <div className="glass space-y-4 rounded-xl p-5">
      {/* ---- Equity curve + drawdown ---- */}
      <div className="rounded-xl well p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <h4 className="text-body-sm font-medium text-fg">Growth against buy and hold</h4>
          <span className="text-caption text-fg-3">
            Solid line the strategy, dashed buy and hold, red how far below its last high
            {result.equity.downsampled && ' · thinned for display'}
          </span>
        </div>
        <EquityChart
          equity={result.equity}
          buyHold={result.buy_hold}
          drawdown={result.drawdown}
          interval={result.interval}
          height={340}
        />
      </div>

      {/* ---- Statistics ---- */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Return" icon={<TrendingUp size={12} />}>
          <Line label="Total return" value={signedPct(s.total_return)} tone={toneFor(s.total_return)} />
          <Line label="CAGR" value={signedPct(s.cagr)} tone={toneFor(s.cagr)} />
          <Line label="Alpha vs buy & hold" value={signedPct(s.alpha_cagr)} tone={toneFor(s.alpha_cagr)} />
          <Line label="Volatility (ann.)" value={pct(s.volatility)} />
          <Line label="Best trade" value={`${num(s.best_trade)}%`} tone="text-up" />
          <Line label="Worst trade" value={`${num(s.worst_trade)}%`} tone="text-down" />
        </Card>

        <Card title="Risk" icon={<ArrowDownRight size={12} />}>
          <Line label="Sharpe" value={num(s.sharpe)} />
          <Line label="Sortino" value={num(s.sortino)} title="Downside deviation only" />
          <Line label="Calmar" value={num(s.calmar)} title="CAGR / max drawdown" />
          <Line
            label="Ulcer index" value={num(e.ulcer_index, 1)}
            title="Root-mean-square drawdown, which counts both how deep and how long"
          />
          <Line
            label="Martin ratio" value={num(e.ulcer_performance_index)}
            title="CAGR per unit of time-weighted drawdown"
          />
          <Line label="Omega" value={ratio(e.omega)} title="Gains above zero / losses below it" />
        </Card>

        <Card title="Trades" icon={<ListOrdered size={12} />}>
          <Line label="Win rate" value={pct(s.win_rate, 1)} />
          <Line label="Payoff ratio" value={ratio(s.payoff)} title="Average win / average loss" />
          <Line label="Expectancy" value={money(s.expectancy, currency)} tone={toneFor(s.expectancy)} />
          <Line label="Avg win / loss" value={`${money(s.avg_win, currency)} / ${money(s.avg_loss, currency)}`} />
          <Line label="Longest streak" value={`${s.win_streak}W · ${s.loss_streak}L`} />
          <Line label="Avg hold" value={`${num(s.avg_bars_held, 1)} bars`} />
          <Line label="Long / short" value={`${s.longs} / ${s.shorts}`} />
        </Card>

        <Card title="Excursions & benchmark" icon={<Ruler size={12} />}>
          <Line
            label="Avg MAE, winners" value={`${num(e.excursions.avg_mae_winners, 1)}%`}
            tone="text-down/80"
            title="How far winners went against you first. This is the evidence for stop width."
          />
          <Line label="Avg MAE, losers" value={`${num(e.excursions.avg_mae_losers, 1)}%`} tone="text-down/80" />
          <Line
            label="Avg give-back" value={`${num(e.excursions.avg_giveback_winners, 1)}%`}
            title="Open profit handed back between the best price and the exit"
          />
          {bench ? (
            <>
              <Line label={`Beta vs ${result.benchmark_symbol}`} value={num(bench.beta)} />
              <Line label="Alpha (ann.)" value={signedPct(bench.alpha_annual)} tone={toneFor(bench.alpha_annual)} />
              <Line label="Correlation" value={num(bench.correlation)} />
            </>
          ) : (
            <Line label="Benchmark" value="not available" tone="text-fg-3" />
          )}
        </Card>
      </div>

      {/* ---- Drawdowns ---- */}
      <Card title="Deepest drawdowns" icon={<ArrowDownRight size={12} />}>
        {e.drawdowns.length === 0 ? (
          <p className="text-caption text-fg-3">This curve never went underwater.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-caption tabular">
              <thead>
                <tr className="border-b border-line text-left text-caption text-fg-3">
                  <th className="py-1.5 pr-2 font-normal">Depth</th>
                  <th className="py-1.5 pr-2 font-normal">Started</th>
                  <th className="py-1.5 pr-2 font-normal">Low</th>
                  <th className="py-1.5 pr-2 font-normal">Recovered</th>
                  <th className="py-1.5 pr-2 text-right font-normal">Underwater</th>
                  <th className="py-1.5 text-right font-normal">Low → recovery</th>
                </tr>
              </thead>
              <tbody>
                {e.drawdowns.map((d, i) => (
                  <tr key={i} className="border-b border-line/50">
                    <td className="py-1.5 pr-2 font-semibold text-down">{pct(d.depth, 1)}</td>
                    <td className="py-1.5 pr-2 text-fg-2">{shortDate(d.start)}</td>
                    <td className="py-1.5 pr-2 text-fg-2">{shortDate(d.trough)}</td>
                    <td className={clsx('py-1.5 pr-2', d.recovered ? 'text-fg-2' : 'text-warn')}>
                      {d.recovered ? shortDate(d.end) : 'still open'}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-fg-3">{d.length_bars} bars</td>
                    <td className="py-1.5 text-right text-fg-3">
                      {d.recovery_bars === null ? '–' : `${d.recovery_bars} bars`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- Monthly returns ---- */}
      <Card title="Monthly returns" icon={<Layers size={12} />}>
        <MonthlyGrid rows={result.monthly} />
      </Card>

      {/* ---- Trade log ---- */}
      <Card title="Trade log" icon={<ArrowUpRight size={12} />}>
        <TradeTable trades={result.trades} currency={currency} />
      </Card>
      </div>
    </div>
  );
}
