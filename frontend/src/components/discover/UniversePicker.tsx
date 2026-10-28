import { useMemo } from 'react';
import { Select } from '../ui/Select';
import type { UniverseMeta } from '../../types/discover';

/**
 * Grouped universe dropdown, shared by every Markets view that scans a
 * universe. The NIFTY index families alone are five entries, so a chip row
 * would wrap and bury the market you want.
 *
 * A universe whose membership could not be built (the NIFTY families depend on
 * the NSE constituent feed) stays visible but disabled, labelled as such:
 * dropping it silently would read as a bug rather than as an upstream outage.
 */

const GROUP_ORDER = ['US', 'India', 'Global', 'Bonds', 'Crypto', 'Commodities'];

export default function UniversePicker({
  universes,
  value,
  onChange,
  id = 'universe-select',
}: {
  universes: UniverseMeta[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const options = useMemo(() => {
    const byGroup = new Map<string, UniverseMeta[]>();
    for (const u of universes) {
      const key = u.group || 'Other';
      byGroup.set(key, [...(byGroup.get(key) ?? []), u]);
    }
    // Known groups in the documented order, then anything the backend adds
    // later that this list has not caught up with.
    const ordered = [
      ...GROUP_ORDER.filter((g) => byGroup.has(g)),
      ...[...byGroup.keys()].filter((g) => !GROUP_ORDER.includes(g)),
    ];
    return ordered.flatMap((group) => byGroup.get(group)!.map((u) => ({
      value: u.id,
      group,
      disabled: u.available === false,
      label: u.available === false ? `${u.label} (unavailable)` : u.count > 0 ? `${u.label} (${u.count})` : u.label,
    })));
  }, [universes]);

  return (
    <div className="flex w-full items-center gap-3 sm:w-auto">
      <label htmlFor={id} className="shrink-0 text-body-sm text-fg-2">Universe</label>
      <Select id={id} value={value} onChange={onChange} options={options} className="sm:w-64" />
    </div>
  );
}
