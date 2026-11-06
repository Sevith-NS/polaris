'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertSheet, CHECK_NOTE, describeAlert } from '@/components/alerts/AlertSheet';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { apiDelete, apiPatch, apiPost, errorMessage } from '@/lib/api';
import { formatNumber, formatPct, timeAgo } from '@/lib/format';
import { announceAlertsSeen } from '@/lib/useAlertCount';
import { optimistic, useApi } from '@/lib/useApi';
import type { Alert, AlertFiring } from '@/types/api';

type Tab = 'scheduled' | 'triggered';

/**
 * Edit, pause, resume, re-arm and delete for one alert. A change shows at once
 * (every view of /api/alerts, the chart's lines too) and the server confirms it
 * behind; a failure puts the alert back and says why.
 */
function Actions({ a, onDeleted, onEdit }: { a: Alert; onDeleted: () => void; onEdit: (a: Alert) => void }) {
  const toast = useToast();
  const act = async (update: (list: Alert[]) => Alert[], write: () => Promise<unknown>, done: string) => {
    try {
      await optimistic<{ alerts: Alert[] }>('/api/alerts', (d) => ({ ...d, alerts: update(d.alerts) }), write);
      toast.show({ message: done });
    } catch (err) {
      toast.show({ message: errorMessage(err), tone: 'error' });
    }
  };
  const setStatus = (status: 'active' | 'paused', done: string) =>
    act((list) => list.map((x) => (x.id === a.id ? { ...x, status, triggered_at: status === 'active' ? null : x.triggered_at } : x)),
        () => apiPatch(`/api/alerts/${a.id}`, { status }), done);
  const remove = () =>
    act((list) => list.filter((x) => x.id !== a.id), () => apiDelete(`/api/alerts/${a.id}`).then(onDeleted), 'Alert deleted');

  return (
    <div className="flex flex-wrap gap-2">
      {a.status === 'triggered' && (
        <Button variant="secondary" onClick={() => setStatus('active', 'Alert is on again')}>Turn on again</Button>
      )}
      {a.status === 'paused' && (
        <Button variant="secondary" onClick={() => setStatus('active', 'Alert resumed')}>Resume</Button>
      )}
      {a.status !== 'triggered' && <Button variant="ghost" onClick={() => onEdit(a)}>Edit</Button>}
      {a.status === 'active' && (
        <Button variant="ghost" onClick={() => setStatus('paused', 'Alert paused')}>Pause</Button>
      )}
      <Button variant="ghost" onClick={remove}>Delete</Button>
    </div>
  );
}

function Row({ subject, label, note, meta, actions }: {
  subject: Pick<Alert, 'symbol' | 'kind' | 'threshold'>; label?: ReactNode; note?: string | null; meta: string; actions?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2 text-body">
          <Link href={`/s/${encodeURIComponent(subject.symbol)}`} className="hover:underline">{describeAlert(subject)}</Link>
          {label}
        </p>
        {note && <p className="text-body-sm text-fg-2">{note}</p>}
        <p className="text-caption text-fg-3 tabular">{meta}</p>
      </div>
      {actions}
    </li>
  );
}

function AlertsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Old links (?tab=active, ?tab=paused) land on Scheduled.
  const tab: Tab = params.get('tab') === 'triggered' ? 'triggered' : 'scheduled';
  const alerts = useApi<{ alerts: Alert[] }>('/api/alerts');
  const firings = useApi<{ firings: AlertFiring[]; unseen: number }>(tab === 'triggered' ? '/api/alerts/firings?limit=100' : null);
  const [sheet, setSheet] = useState<{ open: boolean; alert?: Alert }>({ open: false });
  const markedSeen = useRef(false);

  // Opening Triggered is what "seeing" a firing means, so the bell clears.
  // The list keeps showing them as New for this visit.
  useEffect(() => {
    if (tab !== 'triggered' || !firings.data?.unseen || markedSeen.current) return;
    markedSeen.current = true;
    apiPost('/api/alerts/firings/seen', {}).then(announceAlertsSeen).catch(() => { markedSeen.current = false; });
  }, [tab, firings.data]);

  const setTab = (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false });
  const reload = () => { alerts.reload(); firings.reload(); };
  const edit = (alert: Alert) => setSheet({ open: true, alert });
  const all = alerts.data?.alerts ?? [];
  const scheduled = all.filter((a) => a.status !== 'triggered');

  // Newest firing first. Only an alert's newest firing can act on it, and only while it waits to be turned on again.
  const byId = new Map(all.map((a) => [a.id, a]));
  const listed = new Set<string>();
  const log = (firings.data?.firings ?? []).map((f) => {
    const a = byId.get(f.alert_id);
    const live = !listed.has(f.alert_id) && a?.status === 'triggered' ? a : undefined;
    listed.add(f.alert_id);
    return { f, live };
  });
  // A triggered alert whose firing is older than the 100 loaded still belongs here.
  const older = all.filter((a) => a.status === 'triggered' && !listed.has(a.id));

  const scheduledMeta = (a: Alert) =>
    `Set ${timeAgo(a.created_at)}${a.reference_price ? ` when the price was ${formatNumber(a.reference_price, 2)}` : ''}`
    + (a.status === 'active' && a.last_checked_at ? `. Checked ${timeAgo(a.last_checked_at)}.` : '.');

  const loadingOrError = (alerts.loading && !alerts.data) ? <LoadingBlock lines={4} label="Loading alerts" />
    : (alerts.error && !alerts.data) ? <ErrorState error={alerts.error} title="Couldn't load your alerts" onRetry={alerts.reload} />
    : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader level={1} title="Alerts"
                  description="Get told when a price crosses a level or moves sharply. The quickest way to set one is to right-click a price on any chart."
                  actions={<Button onClick={() => setSheet({ open: true })}>New alert</Button>} />
      <section aria-label="Your alerts" className="glass flex flex-col gap-2 rounded-2xl p-5 md:p-6">
        <Tabs tabs={[
          { id: 'scheduled' as const, label: alerts.data ? `Scheduled (${scheduled.length})` : 'Scheduled' },
          { id: 'triggered' as const, label: 'Triggered' },
        ]} value={tab} onChange={setTab} label="Alert lists" idPrefix="alerts" />

        <div role="tabpanel" id={`alerts-panel-${tab}`} aria-labelledby={`alerts-tab-${tab}`} className="flex flex-col gap-2">
          {loadingOrError ?? (tab === 'scheduled' ? (
            scheduled.length ? (
              <ul className="flex flex-col divide-y divide-white/[0.07]">
                {scheduled.map((a) => (
                  <Row key={a.id} subject={a} note={a.note} meta={scheduledMeta(a)}
                       label={a.status === 'paused' && <span className="pill text-fg-2">Paused</span>}
                       actions={<Actions a={a} onDeleted={firings.reload} onEdit={edit} />} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing scheduled" className="mt-3"
                          action={<Button variant="secondary" onClick={() => setSheet({ open: true })}>New alert</Button>}>
                Right-click a price on any chart to set an alert there, or create one here.
              </EmptyState>
            )
          ) : firings.loading && !firings.data ? <LoadingBlock lines={4} label="Loading fired alerts" />
            : firings.error && !firings.data ? <ErrorState error={firings.error} title="Couldn't load fired alerts" onRetry={firings.reload} />
            : log.length || older.length ? (
              <ul className="flex flex-col divide-y divide-white/[0.07]">
                {log.map(({ f, live }) => (
                  <Row key={f.id} subject={f} note={live?.note}
                       label={!f.seen && <span className="pill text-fg">New</span>}
                       meta={`Fired ${timeAgo(f.fired_at)} at ${formatNumber(f.price, 2)}${f.change_pct !== null ? `, ${formatPct(f.change_pct)} on the day` : ''}.`}
                       actions={live && <Actions a={live} onDeleted={firings.reload} onEdit={edit} />} />
                ))}
                {older.map((a) => (
                  <Row key={a.id} subject={a} note={a.note} meta={`Fired ${a.triggered_at ? timeAgo(a.triggered_at) : 'earlier'}.`}
                       actions={<Actions a={a} onDeleted={firings.reload} onEdit={edit} />} />
                ))}
              </ul>
            ) : (
              <EmptyState title="Nothing has fired yet" className="mt-3">
                When an alert fires it shows here, with the price that set it off.
              </EmptyState>
            ))}
        </div>
        <p className="pt-2 text-caption text-fg-3">{CHECK_NOTE}</p>
      </section>
      <AlertSheet open={sheet.open} alert={sheet.alert} onClose={() => setSheet((s) => ({ ...s, open: false }))}
                  onSaved={() => { reload(); if (!sheet.alert) setTab('scheduled'); }} />
    </div>
  );
}

export default function Alerts() {
  return <Suspense fallback={<LoadingBlock lines={4} label="Loading alerts" />}><AlertsPage /></Suspense>;
}
