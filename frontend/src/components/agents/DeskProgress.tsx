'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Check, CircleDot, Timer } from '@/components/ui/icons';
import type { AnalystEvent, DebateEvent, DeskStage } from '../../types/agents';
import { formatDuration } from '../../lib/format';
import { STAGE_LABELS, STAGE_ORDER } from './deskFormat';

type StepState = 'done' | 'active' | 'waiting';

const WAITING: Record<DeskStage, string> = {
  gather: 'Fundamentals, price structure, quant and news',
  analysts: 'Four specialists, one slice of the data each',
  debate: 'The case for strength opens, the case for caution answers',
  summary: 'A balanced write-up and how the plan was computed',
};

const STATE_WORD: Record<StepState, string> = { done: 'done', active: 'in progress', waiting: 'waiting' };

/**
 * What the desk is doing while it runs: each step with its state and time,
 * which analysts have filed, and the clock. A local model takes a minute or
 * two, so the wait shows real progress rather than a spinner.
 */
export default function DeskProgress({
  symbol, stage, message, startedAt, stageStarts, analysts, debate,
}: {
  symbol: string;
  stage: DeskStage | null;
  message: string;
  startedAt: number;
  stageStarts: Partial<Record<DeskStage, number>>;
  analysts: AnalystEvent[];
  debate: DebateEvent[];
}) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = stage ? STAGE_ORDER.indexOf(stage) : 0;
  const filed = analysts.filter((a) => !a.error);

  const detail = (key: DeskStage, state: StepState) => {
    if (key === 'analysts' && state !== 'waiting') {
      const failed = analysts.length - filed.length;
      return [
        `${analysts.length} of 4 filed`,
        filed.map((a) => a.label.replace(/ Analyst$/, '')).join(', '),
        failed ? `${failed} could not file` : '',
      ].filter(Boolean).join(' · ');
    }
    if (key === 'debate' && state === 'done') return `${debate.length} turns`;
    if (state === 'active' && message) return message;
    return WAITING[key];
  };

  return (
    <section aria-label="Desk progress" className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Timer size={15} className="text-fg-2" /> Working on {symbol}
        </h4>
        <span className="text-caption text-fg-3">
          <span className="tabular text-fg-2">{formatDuration(now - startedAt)}</span> elapsed
        </span>
      </div>

      {/* Only step changes are announced; the clock would be noise every second. */}
      <p className="sr-only" aria-live="polite">{stage ? `${STAGE_LABELS[stage]}. ${message}` : ''}</p>

      <ol className="space-y-3">
        {STAGE_ORDER.map((key, i) => {
          const state: StepState = i < current ? 'done' : i === current ? 'active' : 'waiting';
          const begun = stageStarts[key];
          const took = begun === undefined || state === 'waiting' ? null
            : (state === 'done' ? stageStarts[STAGE_ORDER[i + 1]] ?? now : now) - begun;
          return (
            <li key={key} className="flex items-start gap-3">
              <span className={clsx('mt-0.5 shrink-0',
                state === 'active' ? 'text-fg' : state === 'done' ? 'text-fg-2' : 'text-fg-3/60')}>
                {state === 'done' ? <Check size={14} /> : <CircleDot size={14} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={clsx('text-body-sm',
                  state === 'active' ? 'font-medium text-fg' : state === 'done' ? 'text-fg-2' : 'text-fg-3')}>
                  {STAGE_LABELS[key]}
                  <span className="sr-only">, {STATE_WORD[state]}</span>
                </p>
                <p className="text-caption text-fg-3">{detail(key, state)}</p>
              </div>
              {took !== null && (
                <span className="shrink-0 text-caption tabular text-fg-3">{formatDuration(took)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
