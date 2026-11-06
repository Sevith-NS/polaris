'use client';

import { useState } from 'react';
import { useApi } from './useApi';
import type { QuotesResponse } from '@/types/api';

/**
 * Quotes and a month of daily closes for watchlist rows, in one request
 * (one Yahoo call per 20 symbols on the API side), refreshed every minute.
 * When the list changes, rows already priced keep their numbers while the new
 * answer loads, instead of every row going back to a skeleton.
 */
export function useQuotes(symbols: string[]) {
  // shortcut: the API takes 250 symbols; rows past that stay unpriced. Chunk the request if a list ever gets there.
  const path = symbols.length ? `/api/quotes?symbols=${encodeURIComponent(symbols.slice(0, 250).join(','))}` : null;
  const { data, error } = useApi<QuotesResponse>(path, { refreshMs: 60_000 });
  const [known, setKnown] = useState<{ from?: QuotesResponse; rows: QuotesResponse }>({ rows: { quotes: {}, closes: {} } });
  if (data && data !== known.from) {
    // A new answer: remember its rows (React's "information from previous renders" pattern).
    setKnown({ from: data, rows: { quotes: { ...known.rows.quotes, ...data.quotes }, closes: { ...known.rows.closes, ...data.closes } } });
  }
  return { quotes: { ...known.rows.quotes, ...data?.quotes }, closes: { ...known.rows.closes, ...data?.closes }, error };
}
