'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { UniverseMeta } from '@/types/discover';

/** Shown until the first scan returns the real list (live counts, groups, availability). */
export const FALLBACK_UNIVERSES: UniverseMeta[] = [
  { id: 'us_large', label: 'US Large Cap', group: 'US', count: 0, available: true },
  { id: 'nifty50', label: 'NIFTY 50', group: 'India', count: 0, available: true },
  { id: 'bonds', label: 'Bond ETFs', group: 'Bonds', count: 0, available: true },
  { id: 'crypto', label: 'Crypto Majors', group: 'Crypto', count: 0, available: true },
];

/**
 * The universe every Markets view scans, kept in `?u=` so Overview, Ideas,
 * Levels and Screens all show the same market as you move between them.
 */
export function useUniverse(): [string, (id: string) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('u', id);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return [params.get('u') || 'us_large', set];
}

const memory = { list: FALLBACK_UNIVERSES };

/**
 * The picker's list: the newest one any response carried, remembered across
 * Markets views so one opened from another tab starts with the full list.
 */
export function useUniverses(fresh: UniverseMeta[] | undefined): UniverseMeta[] {
  const [list, setList] = useState(memory.list);
  if (fresh?.length && fresh !== list) setList(fresh);
  useEffect(() => { memory.list = list; }, [list]);
  return list;
}
