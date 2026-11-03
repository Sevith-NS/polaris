'use client';

import { useEffect, useRef } from 'react';
import {
  createChart, ColorType, IChartApi, LineSeries, AreaSeries, LineStyle, PriceScaleMode, Time, type AutoscaleInfo,
} from 'lightweight-charts';
import { formatCompact, formatPct } from '../../lib/format';
import { cssVar, withAlpha } from '../../lib/theme';
import type { Curve } from '../../types/backtest';

const moneyAxis = { type: 'custom' as const, minMove: 0.01, formatter: (v: number) => formatCompact(v) };

const INTRADAY = new Set(['1m', '5m', '15m', '30m', '60m', '1h']);

/**
 * Curve points onto the library's time axis.
 *
 * Daily and slower use a date string so the chart treats them as business days
 * and does not open a weekend-shaped hole; intraday needs a real timestamp.
 * Duplicates and out-of-order points are dropped rather than passed on —
 * setData throws on either, and a thinned curve can repeat a day boundary.
 */
function toSeries(curve: Curve | undefined, interval: string) {
  if (!curve?.points?.length) return [];
  const intraday = INTRADAY.has(interval);
  const out: { time: Time; value: number }[] = [];
  let last: number | string | null = null;
  for (const p of curve.points) {
    if (p.v === null || !Number.isFinite(p.v)) continue;
    const time = intraday
      ? (Math.floor(new Date(`${p.t.replace(' ', 'T')}Z`).getTime() / 1000) as unknown as Time)
      : (p.t.slice(0, 10) as unknown as Time);
    const key = time as unknown as number | string;
    if (last !== null && key <= last) continue;
    last = key;
    out.push({ time, value: p.v });
  }
  return out;
}

/**
 * The equity curve, with buy & hold behind it and the drawdown underneath.
 *
 * Log scale on the equity pane, because a strategy run over decades is a
 * compounding series: on a linear axis the last five years are the only ones
 * with any visible shape, and an early -50% looks like nothing at all.
 */
export default function EquityChart({
  equity, buyHold, drawdown, interval, height = 300, showBuyHold = true,
}: {
  equity: Curve;
  buyHold?: Curve;
  drawdown?: Curve;
  interval: string;
  height?: number;
  showBuyHold?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const line = cssVar('--line');
    const red = cssVar('--red');

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cssVar('--fg-2'),
        panes: { separatorColor: line },
      },
      autoSize: true,
      height,
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      timeScale: { borderColor: line },
      rightPriceScale: { borderColor: line },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const equityData = toSeries(equity, interval);

    if (showBuyHold && buyHold) {
      const bh = chart.addSeries(LineSeries, {
        color: cssVar('--fg-3'),
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        title: 'Buy and hold',
        priceFormat: moneyAxis,
      });
      bh.setData(toSeries(buyHold, interval));
    }

    const strategy = chart.addSeries(LineSeries, {
      color: cssVar('--fg'),
      lineWidth: 2,
      priceLineVisible: false,
      title: 'Strategy',
      priceFormat: moneyAxis,
    });
    strategy.setData(equityData);
    // Log, but only once there is a range worth compressing — a short window
    // whose equity barely moves reads better linear.
    const first = equityData[0]?.value ?? 1;
    const peak = equityData.reduce((m, p) => Math.max(m, p.value), first);
    if (peak / Math.max(first, 1e-9) > 3) {
      strategy.priceScale().applyOptions({ mode: 1 });
    }

    if (drawdown?.points?.length) {
      // Underwater: filled from the line up to 0%, with the axis pinned at 0 so
      // a curve that never makes a new high still reads as hanging below it.
      const dd = chart.addSeries(
        AreaSeries,
        {
          lineColor: red,
          topColor: withAlpha(red, 0.12),
          bottomColor: withAlpha(red, 0.4),
          invertFilledArea: true,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          priceFormat: { type: 'custom', minMove: 0.1, formatter: (v: number) => formatPct(v, 0) },
          autoscaleInfoProvider: (base: () => AutoscaleInfo | null) => {
            const info = base();
            return info?.priceRange ? { ...info, priceRange: { minValue: info.priceRange.minValue, maxValue: 0 } } : info;
          },
        },
        1,
      );
      // A new pane's right scale starts from the chart's, which the log switch
      // above changed: a log drawdown axis ran to -200%. Percent is linear.
      dd.priceScale().applyOptions({ mode: PriceScaleMode.Normal });
      // The payload carries drawdown as a fraction; the axis wants percent.
      dd.setData(toSeries(drawdown, interval).map((p) => ({ ...p, value: p.value * 100 })));
      chart.panes()[1]?.setHeight(Math.round(height * 0.28));
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [equity, buyHold, drawdown, interval, height, showBuyHold]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
