'use client';

import clsx from 'clsx';
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Floating } from './Popover';
import { Check, ChevronDown } from './icons';

export type SelectOption = { value: string; label: string; group?: string; disabled?: boolean };

const triggerClass =
  'flex min-h-11 w-full items-center justify-between gap-2 rounded-sm border border-control/70 bg-black/30 px-3 py-2 text-left ' +
  'text-body text-fg transition-colors duration-fast hover:border-fg-3 focus-visible:border-fg';

/**
 * A dropdown drawn in glass. The browser paints a native <select>'s list
 * itself, so it can't match the app. WAI-ARIA select-only combobox: focus
 * stays on the button and aria-activedescendant names the highlighted
 * option. Enter, Space or an arrow opens it; arrows, Home, End and Page keys
 * move; typing jumps to a label; Enter or Tab picks; Escape closes unchanged.
 * Give it a visible <label htmlFor={id}>, or `label` when there is none.
 */
export function Select({ id, value, onChange, options, label, className }: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  className?: string;
}) {
  const fallbackId = useId();
  const base = id ?? fallbackId;
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Measured on opening: the list is at least as wide as the button, and named like it.
  const [list, setList] = useState({ width: 0, name: '' });

  const enabled = options.flatMap((o, i) => (o.disabled ? [] : [i]));
  const selected = options.findIndex((o) => o.value === value);
  const start = selected >= 0 && !options[selected].disabled ? selected : enabled[0] ?? -1;

  const show = (at: number) => {
    setList({ width: button.current?.offsetWidth ?? 0, name: label ?? button.current?.labels?.[0]?.textContent ?? '' });
    setActive(at);
    setOpen(true);
  };
  const pick = (i: number) => {
    const o = options[i];
    setOpen(false);
    if (o && !o.disabled && o.value !== value) onChange(o.value);
  };

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${base}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, base]);

  // Typing jumps to the next label starting with what was typed in the last half second.
  const typeahead = (e: KeyboardEvent) => {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || !/\S/.test(e.key)) return;
    const now = Date.now();
    const text = (now - typed.current.at < 500 ? typed.current.text : '') + e.key.toLowerCase();
    typed.current = { text, at: now };
    const from = open ? active : selected;
    const after = text.length > 1 ? from : from + 1;
    const order = [...enabled.filter((i) => i >= after), ...enabled.filter((i) => i < after)];
    const hit = order.find((i) => options[i].label.toLowerCase().startsWith(text));
    if (hit === undefined) return;
    e.preventDefault();
    show(hit);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const pos = enabled.indexOf(active);
    const move = (to: number) => { e.preventDefault(); setActive(enabled[Math.max(0, Math.min(enabled.length - 1, to))]); };
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(start); }
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); show(enabled[e.key === 'Home' ? 0 : enabled.length - 1]); }
      else typeahead(e);
      return;
    }
    if (e.key === 'ArrowDown') move(pos + 1);
    else if (e.key === 'ArrowUp') move(pos - 1);
    else if (e.key === 'PageDown') move(pos + 10);
    else if (e.key === 'PageUp') move(pos - 10);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(enabled.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Tab') pick(active);
    // Stopped here so a Sheet or Dialog around this select stays open.
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else typeahead(e);
  };

  const groups: { name?: string; items: number[] }[] = [];
  options.forEach((o, i) => {
    const last = groups[groups.length - 1];
    if (last && last.name === o.group) last.items.push(i);
    else groups.push({ name: o.group, items: [i] });
  });

  const option = (i: number) => {
    const o = options[i];
    return (
      <div key={o.value} id={`${base}-opt-${i}`} role="option" aria-selected={i === selected}
           aria-disabled={o.disabled || undefined}
           onMouseDown={(e) => e.preventDefault()} onClick={() => !o.disabled && pick(i)}
           onMouseMove={() => { if (!o.disabled && active !== i) setActive(i); }}
           className={clsx('flex min-h-11 items-center justify-between gap-3 rounded-md px-3 text-body-sm lg:min-h-9',
             o.disabled ? 'cursor-not-allowed text-fg-3' : 'cursor-pointer text-fg',
             i === active && !o.disabled && 'bg-white/[0.08]')}>
        <span className="truncate">{o.label}</span>
        {i === selected && <Check size={16} aria-hidden="true" className="shrink-0" />}
      </div>
    );
  };

  return (
    <>
      <button ref={button} id={base} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open}
              aria-controls={open ? `${base}-list` : undefined} aria-label={label}
              aria-activedescendant={open && active >= 0 ? `${base}-opt-${active}` : undefined}
              onClick={() => (open ? setOpen(false) : show(start))} onKeyDown={onKeyDown}
              className={clsx(triggerClass, className)}>
        <span className="truncate">{options[selected]?.label ?? ''}</span>
        <ChevronDown size={16} aria-hidden="true"
                     className={clsx('shrink-0 text-fg-3 transition-transform duration-fast', open && 'rotate-180')} />
      </button>
      <Floating open={open} onClose={() => setOpen(false)} anchorRef={button} className="p-1">
        <div id={`${base}-list`} role="listbox" aria-label={list.name || undefined}
             style={{ minWidth: list.width }} className="max-h-72 max-w-[calc(100vw-1rem)] overflow-y-auto">
          {groups.map((g, gi) => g.name ? (
            <div key={`g${gi}`} role="group" aria-labelledby={`${base}-grp-${gi}`}>
              <div id={`${base}-grp-${gi}`} role="presentation" className="px-3 pb-1 pt-2 text-caption text-fg-3">{g.name}</div>
              {g.items.map(option)}
            </div>
          ) : <Fragment key={`g${gi}`}>{g.items.map(option)}</Fragment>)}
        </div>
      </Floating>
    </>
  );
}
