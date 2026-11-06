'use client';

import { useEffect, type ReactNode } from 'react';
import { purgeOtherUsers, setStorageUser } from '@/lib/browser';
import { setApiCacheUser } from '@/lib/useApi';

/**
 * Scopes browser storage, and the in-memory API cache, to the signed-in user.
 * Both are set while rendering, before any child reads them; storage entries
 * belonging to anyone else who used this browser (and pre-scoping keys) are
 * removed after mount.
 */
export function UserStorage({ userId, children }: { userId: string; children: ReactNode }) {
  setStorageUser(userId);
  setApiCacheUser(userId);
  useEffect(() => { purgeOtherUsers(); }, [userId]);
  return children;
}
