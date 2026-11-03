import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/shell/AppShell';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="ambient flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Link href="/" aria-label="Polaris home"><Wordmark /></Link>
      <p className="text-silver text-display-xl tabular" aria-hidden="true">404</p>
      <h1 className="text-h2 text-fg">Page not found</h1>
      <p className="max-w-sm text-body-sm text-fg-2">This page doesn&apos;t exist or has moved. Check the address, or head back.</p>
      <ButtonLink href="/">Back to Polaris</ButtonLink>
    </main>
  );
}
