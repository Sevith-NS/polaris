'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/States';
import { apiDelete, apiGet, errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { ChatSummary } from '@/types/chat';

/**
 * The user's saved Ask Polaris chats, newest first. Opening one continues it;
 * deleting takes a second press on the same spot, since it can't be undone.
 */
export function ChatHistory({ currentId, onOpen, onDeleted }: {
  currentId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<{ chats: ChatSummary[] }>('/api/chats', controller.signal)
      .then((d) => setChats(d.chats))
      .catch((e) => { if ((e as Error).name !== 'AbortError') setError(errorMessage(e)); });
    return () => controller.abort();
  }, []);

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

  if (error) return <p role="alert" className="text-down">{error}</p>;
  if (!chats) return <LoadingBlock lines={3} label="Loading your chats" />;
  if (!chats.length) {
    return <p className="text-fg-2">No saved chats yet. Each answer is kept here, so you can come back to it.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {chats.map((c) => (
        <li key={c.id} className="flex items-center gap-1 py-1">
          <button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === currentId || undefined}
                  className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.06] aria-[current=true]:bg-white/[0.06]">
            <span className="w-full truncate text-fg">{c.title}</span>
            <span className="text-caption text-fg-3">
              {[c.symbol, timeAgo(c.updated_at), `${c.messages} messages`].filter(Boolean).join(' · ')}
            </span>
          </button>
          {confirming === c.id ? (
            <button type="button" ref={(el) => el?.focus()} onClick={() => remove(c.id)} onBlur={() => setConfirming(null)}
                    className="min-h-11 shrink-0 rounded-lg px-2.5 text-caption text-down hover:bg-down/10">
              Delete chat
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(c.id)} aria-label={`Delete the chat "${c.title}"`}
                    className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-fg-3 hover:text-fg">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
