'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { apiGet } from './api';

export type ApiState<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
};

/*
 * One store for every GET made through useApi, keyed by path (T8.6):
 *  - one request per path at a time, however many components ask for it;
 *  - a view that comes back shows its last data at once while a quiet refresh
 *    runs (no blank flash, no spinner over known data);
 *  - every reader of a path sees the same answer, so a reload in one place, or
 *    an `optimistic` write, updates them all.
 * Browser memory only; UserStorage clears it when a different user signs in.
 */
type Entry = { data?: unknown; error: unknown; loading: boolean };

const entries = new Map<string, Entry>();
const flights = new Map<string, Promise<void>>();
const readers = new Map<string, number>();
const listeners = new Set<() => void>();
const MAX_ENTRIES = 150;
let owner: string | null = null;

function put(path: string, entry: Entry) {
  entries.delete(path); // Map order is the eviction order: re-insert as newest
  entries.set(path, entry);
  for (const p of entries.keys()) {
    if (entries.size <= MAX_ENTRIES) break;
    if (!readers.get(p) && !flights.has(p)) entries.delete(p);
  }
  listeners.forEach((l) => l());
}

/** What the store holds for `path`, if anything. */
export function cached<T>(path: string): { data?: T; error: unknown; loading: boolean } | undefined {
  return entries.get(path) as { data?: T; error: unknown; loading: boolean } | undefined;
}

/**
 * Fetch `path` into the store. Joins a request already running for it, unless
 * `force`: a reload after a write must not take an answer that started before it.
 */
export function refresh(path: string, force = false): Promise<void> {
  const running = flights.get(path);
  if (running && !force) return running;
  const flight: Promise<void> = apiGet(path).then(
    (data) => {
      if (flights.get(path) !== flight) return; // superseded or cleared
      flights.delete(path);
      put(path, { data, error: null, loading: false });
    },
    (error: unknown) => {
      if (flights.get(path) !== flight) return;
      flights.delete(path);
      put(path, { data: entries.get(path)?.data, error, loading: false }); // keep the last good data
    },
  );
  flights.set(path, flight);
  put(path, { ...(entries.get(path) ?? { error: null }), loading: true });
  return flight;
}

/**
 * Show a write before the server confirms it: `update` changes the cached data
 * for `path` at once, `write` runs, and `path` reloads either way so the server
 * has the last word. On failure the change is undone at once and the error is
 * re-thrown for the caller to show.
 */
export async function optimistic<T>(path: string, update: (data: T) => T, write: () => Promise<unknown>): Promise<void> {
  const before = entries.get(path);
  flights.delete(path); // an answer already on its way predates this write
  if (before?.data !== undefined) put(path, { ...before, data: update(before.data as T) });
  try {
    await write();
  } catch (err) {
    if (before) put(path, { ...(entries.get(path) ?? before), data: before.data });
    throw err;
  } finally {
    void refresh(path, true);
  }
}

/** Call while rendering for the signed-in user: another user's answers are dropped. */
export function setApiCacheUser(userId: string) {
  if (owner !== null && owner !== userId) {
    entries.clear();
    flights.clear();
  }
  owner = userId;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/**
 * Load one GET endpoint through the shared store. Pass `null` to skip. A reload
 * keeps the last good data on screen; a different path never shows the
 * previous path's data.
 */
export function useApi<T>(path: string | null, { refreshMs }: { refreshMs?: number } = {}): ApiState<T> {
  const entry = useSyncExternalStore(subscribe, () => (path === null ? undefined : entries.get(path)), () => undefined);

  useEffect(() => {
    if (path === null) return;
    readers.set(path, (readers.get(path) ?? 0) + 1);
    void refresh(path);
    const id = refreshMs
      ? window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(path); }, refreshMs)
      : undefined;
    return () => {
      window.clearInterval(id);
      const left = (readers.get(path) ?? 1) - 1;
      if (left > 0) readers.set(path, left);
      else {
        readers.delete(path);
        if (entries.get(path)?.data === undefined) entries.delete(path); // an old error is no reason to wait on return
      }
    };
  }, [path, refreshMs]);

  const reload = useCallback(() => { if (path !== null) void refresh(path, true); }, [path]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error ?? null,
    loading: path !== null && (entry?.loading ?? true),
    reload,
  };
}

/** Run a POST as a query: re-runs when `body` changes (compare by JSON). */
export function usePostQuery<T>(path: string | null, body: unknown, post: (p: string, b: unknown) => Promise<T>): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const json = JSON.stringify(body ?? null);
  const key = `${path}#${json}#${nonce}`;
  const [result, setResult] = useState<{ key: string; base: string; data?: T; error: unknown }>({ key: '', base: '', error: null });

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    post(path, JSON.parse(json))
      .then((data) => { if (!cancelled) setResult({ key, base: json, data, error: null }); })
      .catch((error) => { if (!cancelled) setResult((prev) => ({ key, base: json, data: prev.base === json ? prev.data : undefined, error })); });
    return () => { cancelled = true; };
  }, [path, json, key, post]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    data: result.base === json ? result.data : undefined,
    error: result.base === json ? result.error : null,
    loading: path !== null && result.key !== key,
    reload,
  };
}
