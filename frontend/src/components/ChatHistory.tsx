'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/States';
import { apiDelete, apiGet, errorMessage } from '@/lib/api';
import { formatDateTime, recencyGroup, type Recency } from '@/lib/format';
import type { ChatSummary } from '@/types/chat';

const GROUPS: Recency[] = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];

/**
 * The chats pane, as in a chat app's sidebar: the user's saved Ask Polaris
 * chats grouped by when they were last used, each with its title, when it
 * started and the symbol it was about. Opening one continues it; deleting
 * takes a second press, since it can't be undone. `refreshKey` reloads it.
 */
export function ChatHistory({ currentId, refreshKey, onOpen, onDeleted }: {
  currentId: string | null;
  refreshKey: number;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<{ chats: ChatSummary[] }>('/api/chats?limit=100', controller.signal)
      .then((d) => { setChats(d.chats); setError(''); })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError(errorMessage(e)); });
    return () => controller.abort();
  }, [refreshKey]);

  const remove = async (id: string) => {
    setConfirming(null);
    try {
      await apiDelete(`/api/chats/${encodeURIComponent(id)}`);
      setChats((list) => list?.filter((c) => c.id !== id) ?? null);
      onDeleted(id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (error && !chats) return <p role="alert" className="px-3 text-body-sm text-down">{error}</p>;
  if (!chats) {
    return <LoadingBlock lines={5} label="Loading your chats" className="px-3" />;
  }
  if (!chats.length) {
    return <p className="px-3 text-body-sm text-fg-2">No chats yet. Your conversations will show up here.</p>;
  }

  const groups = GROUPS
    .map((group) => ({ group, items: chats.filter((c) => recencyGroup(c.updated_at) === group) }))
    .filter((g) => g.items.length);
  return (
    <nav aria-label="Your chats" className="flex flex-col gap-4">
      {error && <p role="alert" className="px-3 text-caption text-down">{error}</p>}
      {groups.map(({ group, items }) => (
        <section key={group} aria-labelledby={`chats-${group}`}>
          <h3 id={`chats-${group}`} className="px-3 pb-1 text-caption text-fg-3">{group}</h3>
          <ul className="flex flex-col">
            {items.map((c) => (
              <li key={c.id} className="group relative">
                <button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === currentId ? 'true' : undefined}
                        className="flex min-h-11 w-full min-w-0 flex-col items-start justify-center rounded-lg py-2 pl-3 pr-11 text-left hover:bg-white/[0.06] aria-[current=true]:bg-white/[0.08]">
                  <span className="w-full truncate text-body-sm text-fg">{c.title}</span>
                  <span className="w-full truncate text-caption text-fg-3">
                    {[`Started ${formatDateTime(c.created_at)}`, c.symbol].filter(Boolean).join(' · ')}
                  </span>
                </button>
                {confirming === c.id ? (
                  <button type="button" ref={(el) => el?.focus()} onClick={() => remove(c.id)} onBlur={() => setConfirming(null)}
                          className="absolute inset-y-0 right-0 my-auto h-11 rounded-lg bg-ink-1 px-3 text-caption text-down hover:bg-down/10">
                    Delete
                  </button>
                ) : (
                  // Shown on hover or focus with a mouse; always on touch screens, which have no hover.
                  <button type="button" onClick={() => setConfirming(c.id)} aria-label={`Delete the chat "${c.title}"`}
                          className="absolute inset-y-0 right-0 my-auto grid h-11 w-11 place-items-center rounded-lg text-fg-3 opacity-0 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
