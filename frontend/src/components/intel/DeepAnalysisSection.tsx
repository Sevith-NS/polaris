"use client";
import { Microscope, Hourglass, WifiOff } from '@/components/ui/icons';
import clsx from 'clsx';
import { errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import type { DeepAnalysis } from '../../types/intel';
import FundamentalsPanel from './FundamentalsPanel';
import { AiDeepDive } from './AiDeepDive';
import { fmtPrice, phaseColor, PHASE_LABELS } from './format';
import { tint } from '../../lib/theme';

function PillarBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-24 shrink-0 text-caption capitalize text-fg-3">{label.replace('_', ' ')}</span>
        <span className="flex-1 text-caption text-fg-3">Source unavailable</span>
      </div>
    );
  }
  // value in [-1, 1], center-anchored like the quant factor bars
  const pct = Math.min(Math.abs(value), 1) * 50;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-24 shrink-0 text-caption capitalize text-fg-3">{label.replace('_', ' ')}</span>
      <div className="relative h-1.5 flex-1 bg-white/[0.06]">
        <div className="absolute left-1/2 top-0 h-full w-px bg-line-strong" />
        <div
          className={clsx('absolute top-0 h-full', value >= 0 ? 'bg-up' : 'bg-down')}
          style={value >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }}
        />
      </div>
      <span className={clsx('w-10 text-right text-caption tabular', value >= 0 ? 'text-up' : 'text-down')}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

const PILLAR_NOTES: Record<string, string> = {
  fundamentals: 'health score',
  valuation: 'P/E vs own history',
  technicals: 'market phase',
  quant: 'factor composite',
  news: 'headline tone',
};

/**
 * The deep dive: five readings side by side (no blended call, no conviction,
 * no "buy below" price), technical phase, the fundamentals X-ray, and an AI
 * write-up (AiDeepDive) that explains the data without recommending anything.
 */
export default function DeepAnalysisSection({ symbol, currency }: { symbol: string; currency: string }) {
  const { data, error, loading } = useApi<DeepAnalysis>(`/api/deep-analysis?symbol=${encodeURIComponent(symbol)}`);

  if (loading && !data) {
    return (
      <div className="glass rounded-xl flex items-center gap-3 p-5">
        <Hourglass size={16} className="text-fg-2" />
        <p className="text-sm text-fg-2">
          Running deep analysis for {symbol}. Reading statements, valuation history, phase and news…
        </p>
      </div>
    );
  }
  // A 429 or 5xx must not silently unmount the section: say why it's missing.
  if (error) {
    return (
      <div className="glass rounded-xl flex items-center gap-3 p-5">
        <WifiOff size={16} className="shrink-0 text-warn" />
        <p className="text-sm leading-relaxed text-fg-2">{errorMessage(error)}</p>
      </div>
    );
  }
  // Only vanish when there is genuinely nothing to show and nothing to explain.
  if (!data) return null;

  const { readings, fundamentals } = data;
  const tech = 'error' in data.technical ? null : data.technical;
  const hasTech = tech !== null;
  const pColor = phaseColor(tech?.phase);

  return (
    <div className="space-y-5">
      {/* ---- Readings ---- */}
      <div className="glass rounded-xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Microscope size={15} className="text-fg-2" /> Readings
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-caption text-fg-3">
              fundamentals · valuation · technicals · quant · news
            </span>
          </h3>
          {hasTech && (
            <span
              className="rounded-md px-2 py-1 text-caption font-semibold"
              style={{ color: pColor, background: tint(pColor, 10) }}
            >
              {PHASE_LABELS[tech.phase] || tech.phase}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div>
            {Object.entries(readings.pillars).map(([k, v]) => (
              <PillarBar key={k} label={k} value={v} />
            ))}
          </div>
          <ul className="text-caption leading-relaxed text-fg-3">
            <li className="mb-1 text-fg-2">Each reading runs from −1 (weak on that measure) to +1 (strong).</li>
            {Object.keys(readings.pillars).map((k) => (
              <li key={k}><span className="capitalize">{k}</span>: {PILLAR_NOTES[k] ?? k}</li>
            ))}
            <li className="mt-1">They are shown side by side, not blended into a call. You weigh them.</li>
          </ul>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-3">
          {hasTech && (
            <>
              <div>
                <div className="text-caption text-fg-3">Support / Resistance</div>
                <div className="text-sm font-semibold tabular text-fg">
                  {fmtPrice(tech.support?.near, currency)} · {fmtPrice(tech.resistance?.near, currency)}
                </div>
              </div>
              <div>
                <div className="text-caption text-fg-3">Volume</div>
                <div className={clsx('text-sm font-semibold', tech.volume_read === 'confirming' ? 'text-up' : 'text-warn')}>
                  {tech.volume_read}
                </div>
              </div>
              <div>
                <div className="text-caption text-fg-3">52-week position</div>
                <div className="text-sm font-semibold tabular text-fg">{Math.round((tech.pos_52w ?? 0) * 100)}%</div>
              </div>
            </>
          )}
        </div>
        {hasTech && (
          <p className="mt-2 text-caption leading-relaxed text-fg-2">{tech.phase_note} {tech.volume_note}</p>
        )}
      </div>

      {/* ---- Fundamentals X-Ray ---- */}
      <FundamentalsPanel data={fundamentals} currency={currency} />

      <AiDeepDive symbol={symbol} data={data} />
    </div>
  );
}
