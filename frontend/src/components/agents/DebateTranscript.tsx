'use client';

import clsx from 'clsx';
import { TrendingUp, TrendingDown, Swords, Quote, Crosshair, Handshake } from '@/components/ui/icons';
import type { DebateEvent, DebateSide } from '../../types/agents';
import { Skeleton } from '@/components/ui/States';
import { sideColor } from './deskFormat';
import { MicroLabel, SeatError } from './DeskAtoms';
import { tint } from '../../lib/theme';

/** The next speaker's bubble, on its own side, while the model writes it. */
function PendingTurn({ side }: { side: DebateSide }) {
  const bull = side === 'BULL';
  const label = bull ? 'The case for strength is opening' : 'The case for caution is answering';
  return (
    <div role="status" aria-label={label} className={clsx('flex w-full', bull ? 'justify-start' : 'justify-end')}>
      <div className="w-full lg:max-w-[85%]">
        <p className={clsx('mb-1.5 text-caption text-fg-3', !bull && 'lg:text-right')}>{label}</p>
        <div className="rounded-xl well p-4">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

function Turn({ turn }: { turn: DebateEvent }) {
  const bull = turn.side === 'BULL';
  const color = sideColor(turn.side);
  return (
    <div className={clsx('flex w-full', bull ? 'justify-start' : 'justify-end')}>
      <div className={clsx('min-w-0 max-w-full lg:max-w-[85%]', bull ? 'lg:mr-auto' : 'lg:ml-auto')}>
        <div className={clsx('mb-1.5 flex items-center gap-1.5', !bull && 'lg:justify-end')}>
          <span style={{ color }}>{bull ? <TrendingUp size={13} /> : <TrendingDown size={13} />}</span>
          <span className="text-caption font-semibold" style={{ color }}>{turn.label}</span>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ border: `1px solid ${tint(color, 20)}`, background: tint(color, 5) }}
        >
          {turn.error ? (
            <SeatError message={turn.error} />
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-fg">{turn.argument}</p>

              {turn.evidence && (
                <div className="mt-3 flex gap-2 border-t pt-2.5" style={{ borderColor: tint(color, 15) }}>
                  <Quote size={12} className="mt-0.5 shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <MicroLabel>Standing on</MicroLabel>
                    <p className="mt-0.5 text-caption leading-relaxed text-fg-2">{turn.evidence}</p>
                  </div>
                </div>
              )}

              {(turn.rebuts || turn.concedes) && (
                <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {turn.rebuts && (
                    <div className="flex gap-2">
                      <Crosshair size={12} className="mt-0.5 shrink-0 text-fg-3" />
                      <div className="min-w-0">
                        <MicroLabel>Answering</MicroLabel>
                        <p className="mt-0.5 text-caption leading-relaxed text-fg-3">{turn.rebuts}</p>
                      </div>
                    </div>
                  )}
                  {turn.concedes && (
                    <div className="flex gap-2">
                      <Handshake size={12} className="mt-0.5 shrink-0 text-fg-3" />
                      <div className="min-w-0">
                        <MicroLabel>Concedes</MicroLabel>
                        <p className="mt-0.5 text-caption leading-relaxed text-fg-3">{turn.concedes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The strength/caution exchange, laid out as an argument rather than a document:
 * strength left, caution right. Caution has to answer a named claim, which is
 * why "Answering" is a first-class field instead of buried in the prose.
 */
export default function DebateTranscript({
  turns, pending,
}: { turns: DebateEvent[]; pending: boolean }) {
  if (turns.length === 0 && !pending) return null;

  return (
    <div className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Swords size={15} className="text-fg-2" /> Debate
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-caption text-fg-3">
            one exchange · caution answers strength
          </span>
        </h4>
        <div className="flex items-center gap-3 text-caption text-fg-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-up" /> Strength</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-down" /> Caution</span>
        </div>
      </div>

      <div className="space-y-3">
        {turns.map((turn) => <Turn key={`${turn.round}-${turn.side}`} turn={turn} />)}

        {pending && turns.length < 2 && <PendingTurn side={turns.length === 0 ? 'BULL' : 'BEAR'} />}
      </div>
    </div>
  );
}
