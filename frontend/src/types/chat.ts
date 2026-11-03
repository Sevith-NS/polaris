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

/** POST /api/ai-chat. `thread_id` is null when the history store was down. */
export type ChatReply = { reply: string; thread_id: string | null };
