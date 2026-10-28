'use client';

import clsx from 'clsx';
import { useRef, type KeyboardEvent } from 'react';

/**
 * Pick one of a few options (radiogroup). Drawn as capsule chips that wrap on
 * a phone instead of scrolling out of sight. Tab reaches the chosen chip;
 * arrows, Home and End move and choose, as in the WAI-ARIA radio pattern.
 */
export function Segmented<T extends string>({ options, value, onChange, label, className }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = options.some((o) => o.id === value) ? value : options[0]?.id;

  const onKey = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (i + delta + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={clsx('flex flex-wrap gap-1.5', className)}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button key={o.id} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on}
                  tabIndex={o.id === tabStop ? 0 : -1} onClick={() => onChange(o.id)} onKeyDown={(e) => onKey(e, i)}
                  className={clsx('inline-flex min-h-11 items-center rounded-full border px-4 text-table tabular transition-colors duration-fast lg:min-h-9',
                    on ? 'border-fg bg-fg text-ink-0' : 'border-white/15 bg-black/30 text-fg-2 hover:border-white/30 hover:text-fg')}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
