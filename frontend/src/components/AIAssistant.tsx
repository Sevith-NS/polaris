'use client';

import clsx from 'clsx';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { PanelLeft, Send, SquarePen, X } from '@/components/ui/icons';
import { Spinner } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePortfolio } from '@/context/PortfolioContext';
import { ApiError, DATA_UNAVAILABLE, apiGet, apiStream, errorMessage } from '@/lib/api';
import { readStorage, useBrowserValue, useMediaQuery, writeStorage } from '@/lib/browser';
import { readSseStream } from '@/lib/sse';
import type { ChatEvent, ChatThread } from '@/types/chat';
import { ChatHistory } from './ChatHistory';

type ChatMessage = { role: 'user' | 'assistant'; content: string; error?: boolean };

const PANE_KEY = 'flint.assistant.chats-pane';

const SUGGESTIONS = [
  'How risky is my portfolio right now?',
  'Explain this trade plan in plain words',
  'What would make this setup wrong?',
];

/**
 * Model text is rendered as plain React text, never as HTML: **bold** and
 * bullet lines are the only formatting, parsed into elements here.
 */
function render(text: string): ReactNode {
  return text.split('\n').map((line, i) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const body = line.replace(/^\s*[-*•]\s+/, '');
    const parts = body.split(/\*\*(.+?)\*\*/g).map((p, j) =>
      j % 2 ? <strong key={j} className="font-medium text-fg">{p}</strong> : <Fragment key={j}>{p}</Fragment>);
    return <p key={i} className={clsx('min-h-[0.75em]', bullet && 'pl-4 -indent-3')}>{bullet && '• '}{parts}</p>;
  });
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // The saved chat these messages belong to; null until the first answer is kept.
  const [threadId, setThreadId] = useState<string | null>(null);
  // The chats pane: beside the chat from md up, over it on a phone. Remembered per browser.
  const wide = useMediaQuery('(min-width: 768px)');
  const storedPane = useBrowserValue(() => readStorage(PANE_KEY) === 'open', false);
  const [paneOverride, setPaneOverride] = useState<boolean | null>(null);
  const paneOpen = paneOverride ?? (storedPane && wide);
  const [listKey, setListKey] = useState(0);
  const titleTimer = useRef<number | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const { book, positions } = usePortfolio();
  const pathname = usePathname();
  const symbol = pathname?.startsWith('/s/') ? decodeURIComponent(pathname.split('/')[2] ?? '') || undefined : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  useEffect(() => () => window.clearTimeout(titleTimer.current), []);

  const setPane = (next: boolean) => {
    setPaneOverride(next);
    if (wide) writeStorage(PANE_KEY, next ? 'open' : 'closed');
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  const send = async (text?: string, e?: FormEvent) => {
    e?.preventDefault();
    const content = (text ?? input).trim().slice(0, 4000);
    if (!content || loading) return;
    const next: ChatMessage[] = [...messages.filter((m) => !m.error), { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    const saved = (id: string | null) => {
      if (!id) return;
      setThreadId(id);
      setListKey((k) => k + 1);
      // A new chat is named by the server just after this reply; look again for the name.
      if (!threadId) {
        window.clearTimeout(titleTimer.current);
        titleTimer.current = window.setTimeout(() => setListKey((k) => k + 1), 5000);
      }
    };
    const reply = { started: false, failure: '' };
    try {
      const res = await apiStream('/api/ai-chat', {
        messages: next.slice(-20).map(({ role, content: c }) => ({ role, content: c })),
        thread_id: threadId ?? undefined,
        symbol,
        portfolio: {
          currency: book?.account.currency,
          cash_balance: book ? Number(book.cash) : undefined,
          positions: positions.slice(0, 12).map((p) => ({ symbol: p.symbol, quantity: p.shares, average_cost: p.averagePrice })),
        },
        stream: true,
      });
      // The reply fills in as the model writes it.
      await readSseStream<ChatEvent>(res, (ev) => {
        if (ev.type === 'delta') {
          const first = !reply.started;
          reply.started = true;
          setMessages((m) => (first ? [...m, { role: 'assistant', content: ev.text }]
            : [...m.slice(0, -1), { ...m[m.length - 1], content: m[m.length - 1].content + ev.text }]));
        } else if (ev.type === 'error') reply.failure = ev.message;
        else saved(ev.thread_id);
      });
      if (reply.failure || !reply.started) throw new ApiError(reply.failure || DATA_UNAVAILABLE, 503, 'unavailable');
    } catch (err) {
      // The chat was deleted elsewhere: the next question starts a new one.
      if (err instanceof ApiError && err.status === 404) setThreadId(null);
      // A cut-off answer is replaced, not left half said: the server kept nothing of it either.
      setMessages((m) => [...(reply.started ? m.slice(0, -1) : m), { role: 'assistant', content: errorMessage(err), error: true }]);
    } finally {
      setLoading(false);
    }
  };
  const writing = loading && messages[messages.length - 1]?.role === 'assistant';

  const newChat = () => {
    setMessages([]);
    setThreadId(null);
    if (!wide) setPane(false);
    inputRef.current?.focus();
  };

  const openChat = async (id: string) => {
    try {
      const chat = await apiGet<ChatThread>(`/api/chats/${encodeURIComponent(id)}`);
      setMessages(chat.messages.map(({ role, content }) => ({ role, content })));
      setThreadId(chat.id);
    } catch (err) {
      setMessages([{ role: 'assistant', content: errorMessage(err), error: true }]);
      setThreadId(null);
    }
    // On a phone the pane covers the chat, so it gets out of the way once a chat is picked.
    if (!wide) setPane(false);
  };

  return (
    <>
      {!open && (
        <button ref={launcherRef} type="button" onClick={() => setOpen(true)}
                className="glass-2 fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] right-4 z-30 flex min-h-11 items-center gap-2 rounded-full px-4 text-body-sm text-fg hover:brightness-125 lg:bottom-6 lg:right-6">
          <Image src="/polaris-mark.png" alt="" width={20} height={20} />
          Ask Polaris
        </button>
      )}

      {open && (
        // 400px of chat, plus a 280px chats pane from md up when it is open.
        <section role="dialog" aria-modal="false" aria-labelledby="assistant-h"
                 className={clsx('glass-2 fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top,0px)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,85vh)] sm:w-[400px] sm:rounded-2xl',
                   paneOpen && 'md:w-[680px]')}>
          <div className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
            <Tooltip content={paneOpen ? 'Hide chats' : 'Your chats'} placement="bottom">
              <button type="button" onClick={() => setPane(!paneOpen)} aria-label={paneOpen ? 'Hide chats' : 'Show chats'}
                      aria-expanded={paneOpen} aria-controls="assistant-chats"
                      className="grid min-h-11 min-w-11 place-items-center rounded-lg text-fg-2 hover:bg-white/[0.06] hover:text-fg aria-expanded:text-fg">
                <PanelLeft size={18} />
              </button>
            </Tooltip>
            <div className="min-w-0 flex-1 px-1">
              <h2 id="assistant-h" className="text-body font-medium">Ask Polaris</h2>
              <p className="truncate text-caption text-fg-3">{symbol ? `Looking at ${symbol} and your portfolio` : 'Sees your paper portfolio'}</p>
            </div>
            <Tooltip content="New chat" placement="bottom">
              <button type="button" onClick={newChat} aria-label="New chat" disabled={!messages.length && !threadId}
                      className="grid min-h-11 min-w-11 place-items-center rounded-lg text-fg-2 hover:bg-white/[0.06] hover:text-fg disabled:opacity-40">
                <SquarePen size={18} />
              </button>
            </Tooltip>
            <button type="button" onClick={close} aria-label="Close assistant"
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-fg-2 hover:bg-white/[0.06] hover:text-fg">
              <X />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1">
          {paneOpen && (
            <aside id="assistant-chats" aria-label="Chats"
                   className={clsx('flex flex-col overflow-y-auto px-2 py-3',
                     wide ? 'w-[280px] shrink-0 border-r border-white/10' : 'absolute inset-0 z-10 bg-ink-1')}>
              <ChatHistory currentId={threadId} refreshKey={listKey} onOpen={openChat}
                           onDeleted={(id) => { if (id === threadId) { setMessages([]); setThreadId(null); } }} />
            </aside>
          )}
          {/* Under the phone overlay the chat is out of reach, for the keyboard too. */}
          <div className="flex min-w-0 flex-1 flex-col" inert={paneOpen && !wide}>
          {/* Busy while a reply streams in, so screen readers read it once, whole. */}
          <div ref={scrollRef} aria-live="polite" aria-busy={writing} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-body-sm">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-fg-2">Ask about your positions, risk, or the plan on screen. Answers cite the live numbers Polaris has.</p>
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}
                          className="min-h-11 rounded-lg border border-white/10 bg-black/20 px-3 text-left text-fg-2 hover:border-white/25 hover:text-fg">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={clsx('flex flex-col gap-1', m.role === 'user' && 'items-end')}>
                <span className="text-caption text-fg-3">{m.role === 'user' ? 'You' : 'Polaris'}</span>
                <div className={clsx('max-w-[90%] leading-6',
                  m.role === 'user' ? 'border border-line bg-white/[0.06] px-3 py-2 text-fg' : m.error ? 'text-down' : 'text-fg-2')}>
                  {render(m.content)}
                </div>
              </div>
            ))}
            {loading && !writing && (
              <p role="status" className="flex items-center gap-2 text-fg-3">
                <Spinner size={24} /> Reading the live data
              </p>
            )}
          </div>

          <form onSubmit={(e) => send(undefined, e)} className="border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-input" className="sr-only">Message</label>
              <textarea id="assistant-input" ref={inputRef} rows={1} value={input} maxLength={4000}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                        placeholder="Ask about a ticker, your risk, a plan"
                        className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-body-sm text-fg placeholder:text-fg-3 focus-visible:border-up" />
              <button type="submit" disabled={!input.trim() || loading} aria-label="Send"
                      className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-fg text-ink-0 disabled:opacity-40">
                <Send size={16} />
              </button>
            </div>
            <p className="mt-2 text-caption text-fg-3">Educational analysis on paper trades, not financial advice.</p>
          </form>
          </div>
          </div>
        </section>
      )}
    </>
  );
}
