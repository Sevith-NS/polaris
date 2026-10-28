'use client';

import { ModeBadge } from '@/components/ui/ModeBadge';
import { Select } from '@/components/ui/Select';
import { usePortfolio } from '@/context/PortfolioContext';
import { ALL_REAL, usePortfolioSelection } from './selection';

/**
 * Which book you're looking at: All real, each real account, each paper
 * portfolio (docs/DESIGN.md §7), grouped in the glass Select; the badge
 * beside it says Real or Paper.
 */
export function PortfolioSwitcher() {
  const { accounts } = usePortfolio();
  const { selection, select } = usePortfolioSelection();
  const real = accounts.filter((a) => a.kind === 'real');
  const paper = accounts.filter((a) => a.kind === 'paper');
  if (selection.mode === 'none' || accounts.length < 2) {
    return selection.mode === 'none' ? null : <ModeBadge mode={selection.mode} />;
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="portfolio-switcher" className="sr-only">Portfolio</label>
      <Select id="portfolio-switcher" value={selection.key} onChange={select} className="max-w-[16rem]" options={[
        ...(real.length > 1 ? [{ value: ALL_REAL, label: `All real (${real.length} accounts)`, group: 'Real (read-only)' }] : []),
        ...real.map((a) => ({ value: a.id, label: a.name, group: 'Real (read-only)' })),
        ...paper.map((a) => ({ value: a.id, label: a.name, group: 'Paper (simulated)' })),
      ]} />
      <ModeBadge mode={selection.mode} />
    </div>
  );
}
