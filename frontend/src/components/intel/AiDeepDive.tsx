'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, TrendingDown, TrendingUp } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { LoadingBlock } from '@/components/ui/States';
import { apiGet, errorMessage } from '../../lib/api';
import { formatDuration, timeAgo } from '../../lib/format';
import type { DeepAnalysis, Narrative, NarrativeSources } from '../../types/intel';

type Key = keyof Narrative;

// The model is told to return strings, but a mis-shaped answer must never take
// down the page: arrays become prose, anything else is skipped.
const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v
    : Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ') || null
    : null;

const GROUPS: { title: string; items: { key: Key; title: string }[] }[] = [
  { title: 'The business', items: [
    { key: 'business_model', title: 'Business model' },
    { key: 'competitive_position', title: 'Competitive position' },
    { key: 'management_quality', title: 'Management' },
  ] },
  { title: 'The numbers', items: [
    { key: 'quarterly_results', title: 'Latest results' },
    { key: 'balance_sheet', title: 'Balance sheet' },
    { key: 'valuation', title: 'Valuation' },
  ] },
  { title: 'Price and what comes next', items: [
    { key: 'technical_setup', title: 'Price structure' },
    { key: 'catalysts', title: 'Catalysts' },
    { key: 'what_to_watch', title: 'What to watch' },
  ] },
];
const SECTION_COUNT = 12;

/** The request is one call with no progress events, so the clock is the honest signal. */
function Writing() {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body-sm text-fg-2">
          Fetching the company profile and the latest headlines, then writing twelve sections.
          This usually takes under a minute.
        </p>
        <span className="text-caption text-fg-3">
          <span className="tabular text-fg-2">{formatDuration(now - startedAt)}</span> elapsed
        </span>
      </div>
      <LoadingBlock lines={5} label="Writing the deep dive" />
    </div>
  );
}

function Sources({ sources }: { sources: NarrativeSources }) {
  if (!sources.profile && sources.news.length === 0) return null;
  const label = [
    sources.profile && `the ${sources.profile} company profile`,
    sources.news.length > 0 && `${sources.news.length} headlines`,
  ].filter(Boolean).join(' and ');
  return (
    <details className="group rounded-xl well p-4">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-body-sm text-fg-2 hover:text-fg">
        <span>Written from {label}</span>
        <span aria-hidden="true" className="text-caption text-fg-3 group-open:hidden">Show</span>
        <span aria-hidden="true" className="hidden text-caption text-fg-3 group-open:inline">Hide</span>
      </summary>
      {sources.news.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y divide-line">
          {sources.news.map((n) => (
            <li key={`${n.title}-${n.published}`} className="flex flex-col gap-0.5 py-2.5">
              <span className="text-caption text-fg-3">
                {[n.outlet, n.published && timeAgo(n.published)].filter(Boolean).join(' · ')}
              </span>
              {n.link ? (
                <a href={n.link} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-start gap-1.5 text-body-sm text-fg-2 underline-offset-4 hover:text-fg hover:underline">
                  {n.title}
                  <ExternalLink size={12} aria-hidden="true" className="mt-1 shrink-0" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : <span className="text-body-sm text-fg-2">{n.title}</span>}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/**
 * The AI teardown, written from data fetched at write time: the company profile
 * from Yahoo Finance and the latest dated headlines, plus the computed numbers.
 * The newest saved one shows on open; a complete one is written at most once a
 * day per symbol, and a partial one can be rewritten straight away.
 */
export function AiDeepDive({ symbol, data }: { symbol: string; data: DeepAnalysis }) {
  // A rewrite belongs to the symbol it was written for; switching tickers drops it.
  const [ai, setAi] = useState<{ symbol: string; result?: DeepAnalysis; error?: string } | null>(null);
  const [writing, setWriting] = useState(false);
  const mine = ai?.symbol === symbol ? ai : null;
  const source = mine?.result ?? data;
  const narrative = source.narrative;
  const writtenAt = source.narrative_at;
  const sources = source.narrative_sources ?? null;
  // The backend counts teardown days in IST, so compare in IST too.
  const writtenToday = writtenAt === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

  const write = async () => {
    const forSymbol = symbol;
    setWriting(true);
    setAi(null);
    try {
      const d = await apiGet<DeepAnalysis>(`/api/deep-analysis?symbol=${encodeURIComponent(forSymbol)}&ai=1`);
      setAi(d.narrative ? { symbol: forSymbol, result: d }
        : { symbol: forSymbol, error: "The deep dive can't be written right now. The numbers above still stand." });
    } catch (err) {
      setAi({ symbol: forSymbol, error: errorMessage(err) });
    } finally {
      setWriting(false);
    }
  };

  const text = (key: Key) => (narrative ? asText(narrative[key]) : null);
  const count = narrative ? Object.values(narrative).filter((v) => asText(v)).length : 0;
  const missing = narrative ? SECTION_COUNT - count : 0;
  const canWrite = !writing && (!narrative || !writtenToday || missing > 0);
  const oneLiner = text('one_liner');
  const bull = text('bull_case');
  const bear = text('bear_case');

  return (
    <section aria-labelledby="deep-dive-h" className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div className="min-w-0">
          <h3 id="deep-dive-h" className="text-sm font-semibold text-fg">AI Deep Dive</h3>
          <p className="mt-1 text-caption text-fg-3">
            {narrative && writtenAt
              ? `Written ${new Date(`${writtenAt}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                + (sources?.news.length ? ` from Yahoo Finance and ${sources.news.length} headlines` : '')
              : 'Written from Yahoo Finance, the latest headlines and the numbers above'}
          </p>
        </div>
        {canWrite && (
          <Button variant={narrative ? 'secondary' : 'primary'} size="md" onClick={write}>
            {narrative ? "Rewrite with today's data" : 'Write the deep dive'}
          </Button>
        )}
      </div>

      {writing && <Writing />}

      {!writing && mine?.error && (
        <p role="alert" className="text-body-sm text-down">{mine.error}</p>
      )}

      {!writing && !narrative && !mine?.error && (
        <p className="max-w-prose text-body-sm text-fg-2">
          A plain-English teardown of {symbol}. It covers the business, the latest results, the balance
          sheet, risks and valuation. It reads the company profile and today&apos;s headlines first, and
          it explains without telling you what to do.
        </p>
      )}

      {!writing && narrative && (
        <div className="flex flex-col gap-6">
          {oneLiner && (
            <p className="max-w-prose text-body text-fg">{oneLiner}</p>
          )}

          {(bull || bear) && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {bull && (
                <div className="rounded-xl border border-up/25 bg-up/5 p-4">
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-caption font-semibold text-up">
                    <TrendingUp size={13} aria-hidden="true" /> Going well
                  </h4>
                  <p className="text-body-sm leading-relaxed text-fg-2">{bull}</p>
                </div>
              )}
              {bear && (
                <div className="rounded-xl border border-down/25 bg-down/5 p-4">
                  <h4 className="mb-1.5 flex items-center gap-1.5 text-caption font-semibold text-down">
                    <TrendingDown size={13} aria-hidden="true" /> Could go wrong
                  </h4>
                  <p className="text-body-sm leading-relaxed text-fg-2">{bear}</p>
                </div>
              )}
            </div>
          )}

          {GROUPS.map((group) => {
            const items = group.items.map((s) => ({ ...s, body: text(s.key) })).filter((s) => s.body);
            if (!items.length) return null;
            return (
              <div key={group.title} className="border-t border-line pt-5">
                <h4 className="mb-3 text-body-sm font-medium text-fg">{group.title}</h4>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-3">
                  {items.map((s) => (
                    <div key={s.key}>
                      <h5 className="mb-1 text-caption text-fg-3">{s.title}</h5>
                      <p className="text-body-sm leading-relaxed text-fg-2">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {missing > 0 && (
            <p className="text-body-sm text-warn">
              The model left out {missing} of {SECTION_COUNT} sections this time. Rewrite to try again.
            </p>
          )}

          {sources && <Sources sources={sources} />}
        </div>
      )}

      <p className="mt-5 border-t border-line pt-3 text-caption leading-relaxed text-fg-3">
        Written by an AI model from the numbers above, the Yahoo Finance profile and the headlines it lists.
        It can still get things wrong, so check before relying on it. Not investment advice.
      </p>
    </section>
  );
}
