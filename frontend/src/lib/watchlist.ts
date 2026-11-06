'use client';

import { apiDelete, apiGet, apiPost } from './api';
import { cached, optimistic } from './useApi';
import type { Watchlist } from '@/types/api';

// Every watchlist view reads this one cached path, so a change shown here shows everywhere.
const LISTS = '/api/watchlists';
type Lists = { watchlists: Watchlist[] };

/**
 * Add a symbol to the person's first watchlist, creating it on first use. The
 * row appears at once when the list is known; the server confirms behind it.
 * Pass `listId` when the caller already knows it.
 */
export async function addToWatchlist(symbol: string, listId?: string): Promise<string> {
  const sym = symbol.trim().toUpperCase(); // as the API stores it
  let id = listId ?? cached<Lists>(LISTS)?.data?.watchlists[0]?.id;
  if (!id) {
    const { watchlists } = await apiGet<Lists>(LISTS);
    id = watchlists[0]?.id ?? (await apiPost<{ id: string }>(LISTS, { name: 'Watchlist' })).id;
  }
  const target = id;
  await optimistic<Lists>(LISTS, (d) => ({
    watchlists: d.watchlists.map((w) => (w.id === target && !w.symbols.includes(sym) ? { ...w, symbols: [...w.symbols, sym] } : w)),
  }), () => apiPost(`${LISTS}/${target}/items`, { symbol: sym }));
  return target;
}

/** Remove a symbol from the given lists (every list holding it, usually). It goes at once. */
export async function removeFromWatchlist(symbol: string, listIds: string[]): Promise<void> {
  await optimistic<Lists>(LISTS, (d) => ({
    watchlists: d.watchlists.map((w) => (listIds.includes(w.id) ? { ...w, symbols: w.symbols.filter((s) => s !== symbol) } : w)),
  }), () => Promise.all(listIds.map((id) => apiDelete(`${LISTS}/${id}/items/${encodeURIComponent(symbol)}`))));
}
