import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cached, optimistic, refresh, setApiCacheUser } from './useApi';

/** A fetch whose answers the test releases one at a time, in any order. */
function server() {
  const calls: { url: string; answer: (body: unknown, status?: number) => void }[] = [];
  globalThis.fetch = ((url: string) => new Promise<Response>((resolve) => {
    calls.push({ url, answer: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status })) });
  })) as typeof fetch;
  return calls;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('readers of one path share one request', async () => {
  const calls = server();
  const a = refresh('/api/one');
  const b = refresh('/api/one');
  assert.equal(calls.length, 1);
  assert.equal(cached('/api/one')?.loading, true);
  calls[0].answer({ n: 1 });
  await Promise.all([a, b]);
  assert.deepEqual(cached('/api/one'), { data: { n: 1 }, error: null, loading: false });
});

test('a forced reload wins over an older answer that lands later', async () => {
  const calls = server();
  void refresh('/api/two');
  const fresh = refresh('/api/two', true);
  assert.equal(calls.length, 2);
  calls[1].answer({ v: 'after the write' });
  await fresh;
  calls[0].answer({ v: 'before the write' });
  await tick();
  assert.deepEqual(cached('/api/two')?.data, { v: 'after the write' });
});

test('a failed refresh keeps the last good data and reports the error', async () => {
  const calls = server();
  const first = refresh('/api/three');
  calls[0].answer({ ok: true });
  await first;
  const second = refresh('/api/three');
  calls[1].answer({ error: 'down' }, 503);
  await second;
  const entry = cached('/api/three');
  assert.deepEqual(entry?.data, { ok: true });
  assert.equal((entry?.error as Error).message, 'down');
});

test('an optimistic write shows at once, then the server has the last word', async () => {
  const calls = server();
  const load = refresh('/api/lists');
  calls[0].answer({ symbols: ['AAPL'] });
  await load;

  let finish!: () => void;
  const done = optimistic<{ symbols: string[] }>('/api/lists', (d) => ({ symbols: [...d.symbols, 'TCS.NS'] }),
    () => new Promise<void>((r) => { finish = r; }));
  assert.deepEqual(cached('/api/lists')?.data, { symbols: ['AAPL', 'TCS.NS'] }); // before the server answers
  finish();
  await done;
  assert.equal(calls.length, 2); // reloaded after the write
  calls[1].answer({ symbols: ['AAPL', 'TCS.NS'] });
  await tick();

  const failed = optimistic<{ symbols: string[] }>('/api/lists', () => ({ symbols: [] }),
    () => Promise.reject(new Error('no')));
  assert.deepEqual(cached('/api/lists')?.data, { symbols: [] });
  await assert.rejects(failed, /no/);
  assert.deepEqual(cached('/api/lists')?.data, { symbols: ['AAPL', 'TCS.NS'] }); // undone at once
});

test("another user's answers are dropped", async () => {
  const calls = server();
  setApiCacheUser('user_a');
  const load = refresh('/api/me');
  calls[0].answer({ id: 'user_a' });
  await load;
  setApiCacheUser('user_a');
  assert.ok(cached('/api/me'));
  setApiCacheUser('user_b');
  assert.equal(cached('/api/me'), undefined);
});
