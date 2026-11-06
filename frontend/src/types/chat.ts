// Ask Polaris chat history (backend flint_api/routers/chats.py).

export type ChatRole = 'user' | 'assistant';

export type ChatSummary = {
  id: string;
  /** A short generated name; the first question until that arrives. */
  title: string;
  symbol: string | null;
  created_at: string;
  updated_at: string;
  /** Questions and replies together. */
  messages: number;
};

export type ChatThread = {
  id: string;
  title: string;
  symbol: string | null;
  created_at: string;
  updated_at: string;
  messages: { role: ChatRole; content: string; created_at: string }[];
};

/** POST /api/ai-chat with `stream: true`: the reply as it is written, then the saved chat's id
 *  (null when the history store was down), or an error after any partial text. */
export type ChatEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; thread_id: string | null }
  | { type: 'error'; message: string };
