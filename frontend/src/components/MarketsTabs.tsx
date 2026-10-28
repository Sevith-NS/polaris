'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LinkTabs } from '@/components/ui/Tabs';

/** The Markets section's five views. Each is its own URL. */
const VIEWS = [
  { href: '/markets', label: 'Overview' },
  { href: '/markets/movers', label: 'Movers' },
  { href: '/markets/ideas', label: 'Ideas' },
  { href: '/markets/levels', label: 'Levels' },
  { href: '/markets/screens', label: 'Screens' },
];

/** Carries the chosen universe (`?u=`) to the views that scan one. Movers is NSE only. */
function Tabs() {
  const u = useSearchParams().get('u');
  const tabs = u
    ? VIEWS.map((v) => (v.href === '/markets/movers' ? v : { ...v, href: `${v.href}?u=${encodeURIComponent(u)}` }))
    : VIEWS;
  return <LinkTabs label="Markets views" tabs={tabs} />;
}

export default function MarketsTabs() {
  return (
    <Suspense>
      <Tabs />
    </Suspense>
  );
}
